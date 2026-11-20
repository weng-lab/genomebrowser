// @vitest-environment jsdom

import {
  createTrackStore,
  defineTrackModule,
  type TrackStoreInstance,
} from "@weng-lab/genomebrowser";
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { TrackSortDialog, type TrackSortOption } from "../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type SampleInfo = { sample: string; assay: string };

const signalModule = defineTrackModule({
  type: "signal",
  configSchema: z.object({ url: z.string().min(1) }),
  fetch: async () => null,
  render: { full: () => null },
});

const options: TrackSortOption[] = [
  { id: "sample", label: "Sample", value: (track) => sampleInfo.get(track.base.id)?.sample },
  { id: "assay", label: "Assay", value: (track) => sampleInfo.get(track.base.id)?.assay },
];

const sampleInfo = new Map<string, SampleInfo>([
  ["pinned-s2-atac", { sample: "s2", assay: "ATAC" }],
  ["s2-rna", { sample: "s2", assay: "RNA" }],
  ["s1-rna", { sample: "s1", assay: "RNA" }],
  ["s2-atac", { sample: "s2", assay: "ATAC" }],
  ["s1-atac", { sample: "s1", assay: "ATAC" }],
]);

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.useRealTimers();
});

describe("TrackSortDialog", () => {
  it("starts empty and sorts by the added options in priority order, each in its own direction", () => {
    const trackStore = createStore();
    const onClose = vi.fn<() => void>();
    mount(<TrackSortDialog trackStore={trackStore} open onClose={onClose} options={options} />);

    expect(priorityLabels()).toEqual([]);
    expect(applyButton().disabled).toBe(true);
    expect(pickerOptions()).toEqual(["Sample", "Assay"]);
    addOption("Sample");
    addOption("Assay");
    expect(priorityLabels()).toEqual(["Sample", "Assay"]);
    expect(picker().value).toBe("");
    expect(direction("Sample")).toBe("Ascending");
    setDirection("Sample", "Descending");
    clickButton("Apply order");

    // Pinned tracks keep their positions, and tracks without values go last.
    expect(trackStore.getState().order).toEqual([
      "pinned-s2-atac",
      "s2-atac",
      "s2-rna",
      "s1-atac",
      "s1-rna",
      "genes",
      "other",
    ]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("removes options from the sort and offers them in the picker again", () => {
    const trackStore = createStore();
    mount(
      <TrackSortDialog
        trackStore={trackStore}
        open
        onClose={vi.fn<() => void>()}
        options={options}
      />,
    );

    addOption("Sample");
    addOption("Assay");
    expect(pickerOptions()).toEqual([]);
    removeOption("Sample");
    expect(priorityLabels()).toEqual(["Assay"]);
    expect(pickerOptions()).toEqual(["Sample"]);
    clickButton("Apply order");
    // Ties on assay keep the current order.
    expect(sortableOrder(trackStore)).toEqual(["s2-atac", "s1-atac", "s2-rna", "s1-rna"]);
  });

  it("discards cancelled drafts and reopens with the last applied sort", () => {
    vi.useFakeTimers();
    const trackStore = createStore();
    mount(<DialogHost trackStore={trackStore} />);

    clickButton("Open sort");
    addOption("Assay");
    setDirection("Assay", "Descending");
    clickButton("Apply order");
    closeTransition();
    const appliedOrder = trackStore.getState().order;

    clickButton("Open sort");
    expect(priorityLabels()).toEqual(["Assay"]);
    expect(direction("Assay")).toBe("Descending");
    addOption("Sample");
    setDirection("Assay", "Ascending");
    clickButton("Cancel");
    closeTransition();
    expect(trackStore.getState().order).toBe(appliedOrder);

    clickButton("Open sort");
    expect(priorityLabels()).toEqual(["Assay"]);
    expect(direction("Assay")).toBe("Descending");
  });

  it("drops applied options that are no longer offered", () => {
    vi.useFakeTimers();
    const trackStore = createStore();
    const [sample, assay] = options;
    mount(<DialogHost trackStore={trackStore} />);

    clickButton("Open sort");
    addOption("Sample");
    clickButton("Apply order");
    closeTransition();

    act(() => root!.render(<DialogHost trackStore={trackStore} options={[assay]} />));
    clickButton("Open sort");
    expect(priorityLabels()).toEqual([]);
    expect(applyButton().disabled).toBe(true);
    addOption("Assay");
    clickButton("Apply order");
    closeTransition();

    // Applying forgets the option, so it stays out when it's offered again.
    act(() => root!.render(<DialogHost trackStore={trackStore} options={[sample, assay]} />));
    clickButton("Open sort");
    expect(priorityLabels()).toEqual(["Assay"]);
  });
});

function DialogHost({
  trackStore,
  options: hostOptions = options,
}: {
  trackStore: TrackStoreInstance;
  options?: TrackSortOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open sort</button>
      <TrackSortDialog
        trackStore={trackStore}
        open={open}
        onClose={() => setOpen(false)}
        options={hostOptions}
      />
    </>
  );
}

function createStore() {
  const ids = ["pinned-s2-atac", "genes", "s2-rna", "s1-rna", "s2-atac", "other", "s1-atac"];
  return createTrackStore({
    modules: [signalModule],
    tracks: ids.map((id) => signalModule.create({ base: { id, title: id }, config: { url: id } })),
    pinnedTrackIds: ["pinned-s2-atac"],
  });
}

function sortableOrder(trackStore: TrackStoreInstance) {
  return trackStore.getState().order.filter((id) => sampleInfo.has(id) && !id.startsWith("pinned"));
}

function mount(ui: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(ui));
}

function closeTransition() {
  act(() => {
    vi.runAllTimers();
  });
}

function clickButton(label: string) {
  const button = Array.from(document.body.querySelectorAll<HTMLElement>('button, [role="button"]'))
    .filter((element) => element.textContent === label)
    .at(-1);
  expect(button).toBeDefined();
  act(() => button!.click());
}

function removeOption(label: string) {
  const button = document.body.querySelector<HTMLElement>(`[aria-label="Remove ${label}"]`);
  expect(button).not.toBeNull();
  act(() => button!.click());
}

function picker() {
  const input = document.body.querySelector<HTMLInputElement>('input[role="combobox"]');
  expect(input).not.toBeNull();
  return input!;
}

function openPicker() {
  const input = picker();
  act(() => input.focus());
  act(() => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  });
  return Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]'));
}

function pickerOptions() {
  return picker().disabled ? [] : openPicker().map((option) => option.textContent);
}

function addOption(label: string) {
  const option = openPicker().find((candidate) => candidate.textContent === label);
  expect(option).toBeDefined();
  act(() => option!.click());
}

function directionGroup(label: string) {
  const group = document.body.querySelector(`[aria-label="${label} sort direction"]`);
  expect(group).not.toBeNull();
  return group!;
}

function direction(label: string) {
  return directionGroup(label).querySelector('[aria-pressed="true"]')?.textContent;
}

function setDirection(label: string, text: string) {
  const button = Array.from(directionGroup(label).querySelectorAll<HTMLElement>("button")).find(
    (candidate) => candidate.textContent === text,
  );
  expect(button).toBeDefined();
  act(() => button!.click());
}

function applyButton() {
  const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.textContent === "Apply order",
  );
  expect(button).toBeDefined();
  return button!;
}

function priorityLabels() {
  const list = document.body.querySelector('[aria-label="Sort priority"]');
  return Array.from(list?.querySelectorAll("li") ?? []).map(
    (item) => item.querySelector(".MuiListItemText-primary")?.textContent,
  );
}
