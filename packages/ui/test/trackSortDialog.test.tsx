// @vitest-environment jsdom

import {
  createTrackStore,
  defineTrackModule,
  type AnyTrackInstance,
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

const assayRank = new Map([
  ["ATAC", 0],
  ["RNA", 1],
]);

const options: TrackSortOption<SampleInfo>[] = [
  { id: "sample", label: "Sample", compare: (a, b) => a.sample.localeCompare(b.sample) },
  {
    id: "assay",
    label: "Assay",
    compare: (a, b) => assayRank.get(a.assay)! - assayRank.get(b.assay)!,
  },
];

const sampleInfo = new Map<string, SampleInfo>([
  ["pinned-s2-atac", { sample: "s2", assay: "ATAC" }],
  ["s2-rna", { sample: "s2", assay: "RNA" }],
  ["s1-rna", { sample: "s1", assay: "RNA" }],
  ["s2-atac", { sample: "s2", assay: "ATAC" }],
  ["s1-atac", { sample: "s1", assay: "ATAC" }],
]);

const getMetadata = (track: AnyTrackInstance) => sampleInfo.get(track.base.id);

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
  it("sorts described tracks by option priority and leaves pinned and undescribed tracks in place", () => {
    const trackStore = createStore();
    const onClose = vi.fn<() => void>();
    mount(
      <TrackSortDialog
        trackStore={trackStore}
        open
        onClose={onClose}
        options={options}
        getMetadata={getMetadata}
      />,
    );

    expect(priorityLabels()).toEqual(["Sample", "Assay"]);
    clickButton("Apply order");

    expect(trackStore.getState().order).toEqual([
      "pinned-s2-atac",
      "genes",
      "s1-atac",
      "s1-rna",
      "s2-atac",
      "other",
      "s2-rna",
    ]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("drops excluded options and re-adds included ones as the lowest-priority tiebreaker", () => {
    const trackStore = createStore();
    mount(
      <TrackSortDialog
        trackStore={trackStore}
        open
        onClose={vi.fn<() => void>()}
        options={options}
        getMetadata={getMetadata}
      />,
    );

    clickButton("Sample");
    expect(chip("Sample").getAttribute("aria-pressed")).toBe("false");
    expect(priorityLabels()).toEqual(["Assay"]);
    clickButton("Apply order");
    // Ties on assay keep the current order.
    expect(sortableOrder(trackStore)).toEqual(["s2-atac", "s1-atac", "s2-rna", "s1-rna"]);

    clickButton("Sample");
    expect(priorityLabels()).toEqual(["Assay", "Sample"]);
    clickButton("Apply order");
    expect(sortableOrder(trackStore)).toEqual(["s1-atac", "s2-atac", "s1-rna", "s2-rna"]);
  });

  it("replaces chips with an add picker and remove buttons when there are more than five options", () => {
    const trackStore = createStore();
    const noOpOptions = ["Lab", "Tissue", "Donor", "Platform"].map(
      (label): TrackSortOption<SampleInfo> => ({ id: label, label, compare: () => 0 }),
    );
    mount(
      <TrackSortDialog
        trackStore={trackStore}
        open
        onClose={vi.fn<() => void>()}
        options={[...options, ...noOpOptions]}
        getMetadata={getMetadata}
      />,
    );

    expect(document.body.querySelector("[aria-pressed]")).toBeNull();
    removeOption("Sample");
    // Leave a second option available so the picker stays enabled after the pick.
    removeOption("Lab");
    expect(priorityLabels()).toEqual(["Assay", "Tissue", "Donor", "Platform"]);

    const picker = document.body.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    act(() => picker.focus());
    act(() => {
      picker.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const available = Array.from(document.body.querySelectorAll('[role="option"]'));
    expect(available.map((option) => option.textContent)).toEqual(["Sample", "Lab"]);
    act(() => (available[0] as HTMLElement).click());
    expect(priorityLabels()).toEqual(["Assay", "Tissue", "Donor", "Platform", "Sample"]);
    expect(picker.value).toBe("");

    clickButton("Apply order");
    expect(sortableOrder(trackStore)).toEqual(["s1-atac", "s2-atac", "s1-rna", "s2-rna"]);
  });

  it("discards cancelled drafts and reopens with the last applied priority", () => {
    vi.useFakeTimers();
    const trackStore = createStore();
    mount(<DialogHost trackStore={trackStore} />);

    clickButton("Open sort");
    clickButton("Sample");
    clickButton("Apply order");
    closeTransition();
    const appliedOrder = trackStore.getState().order;

    clickButton("Open sort");
    expect(priorityLabels()).toEqual(["Assay"]);
    clickButton("Sample");
    expect(priorityLabels()).toEqual(["Assay", "Sample"]);
    clickButton("Cancel");
    closeTransition();
    expect(trackStore.getState().order).toBe(appliedOrder);

    clickButton("Open sort");
    expect(priorityLabels()).toEqual(["Assay"]);
    expect(chip("Sample").getAttribute("aria-pressed")).toBe("false");
  });
});

function DialogHost({ trackStore }: { trackStore: TrackStoreInstance }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open sort</button>
      <TrackSortDialog
        trackStore={trackStore}
        open={open}
        onClose={() => setOpen(false)}
        options={options}
        getMetadata={getMetadata}
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
  act(() => vi.runAllTimers());
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

function chip(label: string) {
  const element = Array.from(document.body.querySelectorAll('[role="button"]')).find(
    (candidate) => candidate.textContent === label && candidate.hasAttribute("aria-pressed"),
  );
  expect(element).toBeDefined();
  return element!;
}

function priorityLabels() {
  const list = document.body.querySelector('[aria-label="Sort priority"]');
  return Array.from(list?.querySelectorAll("li") ?? []).map(
    (item) => item.querySelector(".MuiListItemText-primary")?.textContent,
  );
}
