// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  type TrackMetadata,
} from "../../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const signalModule = defineTrackModule({
  type: "signal",
  configSchema: z.object({ url: z.string().min(1) }),
  fetch: async () => null,
  render: { full: () => null },
});

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let trackStore: ReturnType<typeof createTrackStore>;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

it("shows a track's fields by type and saves each valid edit to the track", async () => {
  await openSettings({ Assay: "ChIP-seq", Replicate: 2, Interesting: true, Note: null });

  expect(rowSummaries()).toEqual([
    ["Assay", "Text", "ChIP-seq"],
    ["Replicate", "Number", "2"],
    ["Interesting", "True or false", "True"],
    ["Note", "No value", ""],
  ]);

  await type(textInputs(row(1))[1], "ATAC-seq");
  await choose(row(3), 1, "False");
  await choose(row(2), 0, "Text");
  expect(metadata()).toEqual({ Assay: "ATAC-seq", Replicate: "2", Interesting: false, Note: null });

  await click(button("Remove the field Note"));
  await click(button("Add field"));
  const [name, value] = textInputs(row(4));
  expect(document.activeElement).toBe(name);
  await type(name, "Donor");
  await type(value, "D3");
  expect(metadata()).toEqual({
    Assay: "ATAC-seq",
    Replicate: "2",
    Interesting: false,
    Donor: "D3",
  });
});

it("keeps the last valid metadata while a field isn't valid, and says why", async () => {
  await openSettings({ Assay: "ChIP-seq", Replicate: 2 });
  const saved = metadata();

  // A cleared number only needs typing; it isn't stored as 0.
  await type(textInputs(row(2))[1], "");
  expect(problem(row(2))).toEqual({ message: 'Enter a number for "Replicate".', error: false });

  await click(button("Add field"));
  await type(textInputs(row(3))[0], "Donor");
  expect(problem(row(3))).toEqual({
    message: 'Enter a value for "Donor", or remove the field.',
    error: false,
  });

  await type(textInputs(row(1))[0], "title");
  expect(problem(row(1))).toEqual({
    message: `A field can't be named "title", which is the track's own title. Choose another name.`,
    error: true,
  });
  await type(textInputs(row(1))[0], "Replicate");
  expect(problem(row(1))).toEqual({
    message: 'Two fields are named "Replicate". Rename one.',
    error: true,
  });
  await type(textInputs(row(2))[1], "two");
  expect(problem(row(2))?.message).toBe('Two fields are named "Replicate". Rename one.');
  await type(textInputs(row(1))[0], "Assay");
  expect(problem(row(2))).toEqual({ message: 'Enter a number for "Replicate".', error: true });
  expect(metadata()).toBe(saved);

  await type(textInputs(row(2))[1], "3");
  await type(textInputs(row(3))[1], "D3");
  expect(problem(row(2))).toBeUndefined();
  expect(metadata()).toEqual({ Assay: "ChIP-seq", Replicate: 3, Donor: "D3" });
});

it("rebuilds the fields when the track's metadata changes elsewhere", async () => {
  await openSettings({ Assay: "ChIP-seq" });
  await click(button("Add field"));
  await type(textInputs(row(2))[0], "Unfinished");

  await act(async () =>
    trackStore.getState().updateTrack("signal", { metadata: { Cell: "K562" } }),
  );
  expect(rowSummaries()).toEqual([["Cell", "Text", "K562"]]);
});

async function openSettings(metadata: TrackMetadata) {
  trackStore = createTrackStore({
    modules: [signalModule],
    tracks: [
      signalModule.create({
        base: { id: "signal", title: "Signal" },
        config: { url: "YOUR_URL_HERE" },
        metadata,
      }),
    ],
  });
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 1_000, end: 2_000 },
    trackWidth: 1_000,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
    ),
  );
  await click(container.querySelector('[aria-label="Settings for Signal"]'));
}

function metadata() {
  return trackStore.getState().getTrack("signal")?.metadata;
}

function row(index: number) {
  const element = document.querySelector<HTMLElement>(
    `[aria-label="Metadata"] [aria-label="Field ${index}"]`,
  );
  if (!element) throw new Error(`No metadata field ${index}`);
  return element;
}

function rows() {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[aria-label="Metadata"] [aria-label^="Field "]'),
  );
}

/** The row's text inputs: its name, then its value unless the value is a choice. */
function textInputs(element: HTMLElement) {
  return Array.from(
    element.querySelectorAll<HTMLInputElement>("input:not(.MuiSelect-nativeInput)"),
  );
}

/** The row's choices: its type, then its value when the value is true or false. */
function choices(element: HTMLElement) {
  return Array.from(element.querySelectorAll<HTMLElement>('[role="combobox"]'));
}

function rowSummaries() {
  return rows().map((element) => {
    const [name, value] = textInputs(element);
    const [type, choice] = choices(element);
    return [name.value, type.textContent, choice ? choice.textContent : value.value];
  });
}

function problem(element: HTMLElement) {
  const text = element.querySelector(".MuiFormHelperText-root");
  if (!text) return undefined;
  // The message describes the row's name input, so screen readers read it there.
  expect(textInputs(element)[0].getAttribute("aria-describedby")).toBe(text.id);
  return { message: text.textContent, error: text.classList.contains("Mui-error") };
}

function button(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) =>
      candidate.getAttribute("aria-label") === label || candidate.textContent === label,
  );
}

async function click(element: Element | null | undefined) {
  if (!element) throw new Error("Nothing to click");
  await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function choose(element: HTMLElement, index: number, option: string) {
  const combobox = choices(element)[index];
  await act(async () =>
    combobox.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 })),
  );
  const item = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (candidate) => candidate.textContent === option,
  );
  await click(item);
}
