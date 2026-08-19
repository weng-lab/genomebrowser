// @vitest-environment jsdom

import { act, Profiler } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTrackStore, type TrackStoreInstance } from "../../src/browser/state/trackStore";
import type { TrackInstance, TrackMutationResult, TrackUpdate } from "../../src/modules/types";
import { bulkBedModule } from "../../src/tracks/bulkbed/module";
import { BulkBedSettings } from "../../src/tracks/bulkbed/settings";
import type { BulkBedConfig, BulkBedDataset, BulkBedRect } from "../../src/tracks/bulkbed/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialConfig: BulkBedConfig = {
  datasets: [dataset("Dataset A"), dataset("Dataset B"), dataset("Dataset C")],
};

type HarnessProps = {
  onSettingsRender?: () => void;
  rejectAdd?: boolean;
  rejectRemove?: boolean;
  trackId?: string;
};

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let useTrackStore: TrackStoreInstance | undefined;
let rejectAddUpdate = false;
let rejectRemoveUpdate = false;

function Harness({ onSettingsRender = () => undefined, trackId = "bulk-peaks" }: HarnessProps) {
  const useStore = useTrackStore;
  if (!useStore) throw new Error("Track store not initialized");
  const track = useStore((state) => state.getTrack(trackId)) as
    | TrackInstance<BulkBedConfig, BulkBedRect>
    | undefined;
  if (!track) throw new Error(`Track not found: ${trackId}`);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const current = useStore.getState().getTrack(trackId)?.config as BulkBedConfig;
          useStore.getState().updateTrack<BulkBedConfig>(trackId, {
            config: {
              datasets: [
                ...current.datasets,
                dataset(`External ${current.datasets.length + 1}`),
                dataset(`External ${current.datasets.length + 2}`),
              ],
            },
          });
        }}
      >
        Append externally
      </button>
      <button
        type="button"
        onClick={() => {
          const current = useStore.getState().getTrack(trackId)?.config as BulkBedConfig;
          useStore.getState().updateTrack<BulkBedConfig>(trackId, {
            config: { datasets: current.datasets.slice(0, 2) },
          });
        }}
      >
        Shorten externally
      </button>
      <Profiler id="bulkbed-settings" onRender={onSettingsRender}>
        <BulkBedSettings
          track={track}
          updateTrack={(update) => useStore.getState().updateTrack(trackId, update)}
        />
      </Profiler>
    </>
  );
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  useTrackStore = undefined;
  rejectAddUpdate = false;
  rejectRemoveUpdate = false;
  vi.restoreAllMocks();
});

describe("BulkBed settings", () => {
  it("renders from the fresh complete track after an unrelated base update", async () => {
    let renderCount = 0;
    await renderHarness({ onSettingsRender: () => renderCount++ });
    const initialRenderCount = renderCount;
    const initialTrack = useTrackStore?.getState().getTrack("bulk-peaks");

    await act(async () => {
      useTrackStore?.getState().updateTrack("bulk-peaks", { base: { color: "#112233" } });
    });

    const updatedTrack = useTrackStore?.getState().getTrack("bulk-peaks");
    expect(updatedTrack).not.toBe(initialTrack);
    expect(updatedTrack?.base.color).toBe("#112233");
    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(datasetNames()).toEqual(["Dataset A", "Dataset B", "Dataset C"]);
  });

  it("does not replay accepted edits after restoring an earlier datasets reference", async () => {
    const baselineTrack = createTrack("bulk-peaks");
    const advancedTrack = {
      ...baselineTrack,
      config: {
        ...baselineTrack.config,
        datasets: baselineTrack.config.datasets.map((item) => ({
          ...item,
          name: `${item.name} externally updated`,
        })),
      },
    };
    const updateTrack = vi.fn<
      (update: TrackUpdate<BulkBedConfig, BulkBedRect>) => TrackMutationResult
    >(() => ({ ok: true }));

    await renderControlledSettings(baselineTrack, updateTrack);
    await updateTextInput(textInputs()[0], "Accepted Dataset A");
    await renderControlledSettings(advancedTrack, updateTrack);
    await renderControlledSettings(baselineTrack, updateTrack);
    await updateTextInput(textInputs()[1], "RESTORED_C0_URL");

    expect(updateTrack).toHaveBeenLastCalledWith({
      config: {
        datasets: [
          { name: "Dataset A", url: "RESTORED_C0_URL" },
          dataset("Dataset B"),
          dataset("Dataset C"),
        ],
      },
    });
  });

  it("preserves unaffected rows through a middle removal and subsequent addition", async () => {
    await renderHarness();
    const firstRow = datasetRow("Dataset A");
    const middleRow = datasetRow("Dataset B");
    const lastRow = datasetRow("Dataset C");

    await act(async () => removeButton(middleRow).click());
    expect(datasetNames()).toEqual(["Dataset A", "Dataset C"]);
    expect(datasetRow("Dataset A")).toBe(firstRow);
    expect(datasetRow("Dataset C")).toBe(lastRow);
    expect(container?.contains(middleRow)).toBe(false);

    await act(async () => button("Add dataset").click());
    expect(datasetNames()).toEqual(["Dataset A", "Dataset C", "Dataset 3"]);
    expect(datasetRow("Dataset A")).toBe(firstRow);
    expect(datasetRow("Dataset C")).toBe(lastRow);
    expect([firstRow, lastRow]).not.toContain(datasetRow("Dataset 3"));
  });

  it("numbers rapid additions from the latest accepted datasets", async () => {
    await renderHarness();

    await act(async () => {
      button("Add dataset").click();
      button("Add dataset").click();
    });

    expect(datasetNames()).toEqual([
      "Dataset A",
      "Dataset B",
      "Dataset C",
      "Dataset 4",
      "Dataset 5",
    ]);
  });

  it("gives external appends stable distinct rows without key warnings", async () => {
    await renderHarness();
    const existingRows = initialConfig.datasets.map((item) => datasetRow(item.name));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await act(async () => button("Append externally").click());

    expect(datasetNames()).toEqual([
      "Dataset A",
      "Dataset B",
      "Dataset C",
      "External 4",
      "External 5",
    ]);
    expectExistingRows(existingRows);
    const appendedRows = [datasetRow("External 4"), datasetRow("External 5")];
    expect(appendedRows[0]).not.toBe(appendedRows[1]);
    expect(existingRows).not.toContain(appendedRows[0]);
    expect(existingRows).not.toContain(appendedRows[1]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("uses prefix identity when the controlled config shortens externally", async () => {
    await renderHarness();
    const firstRow = datasetRow("Dataset A");
    const secondRow = datasetRow("Dataset B");
    const removedRow = datasetRow("Dataset C");

    await act(async () => button("Shorten externally").click());

    expect(datasetNames()).toEqual(["Dataset A", "Dataset B"]);
    expect(datasetRow("Dataset A")).toBe(firstRow);
    expect(datasetRow("Dataset B")).toBe(secondRow);
    expect(container?.contains(removedRow)).toBe(false);
  });

  it("does not change rows when a removal is rejected", async () => {
    await renderHarness({ rejectRemove: true });
    const rows = initialConfig.datasets.map((item) => datasetRow(item.name));

    await act(async () => removeButton(rows[1]).click());

    expect(datasetNames()).toEqual(["Dataset A", "Dataset B", "Dataset C"]);
    expectExistingRows(rows);
  });

  it("does not change rows when an addition is rejected", async () => {
    await renderHarness({ rejectAdd: true });
    const rows = initialConfig.datasets.map((item) => datasetRow(item.name));

    await act(async () => button("Add dataset").click());

    expect(datasetNames()).toEqual(["Dataset A", "Dataset B", "Dataset C"]);
    expectExistingRows(rows);
  });

  it("resets row identity when the controlled track id changes", async () => {
    await renderHarness();
    const rows = initialConfig.datasets.map((item) => datasetRow(item.name));

    await renderHarness({ trackId: "other-bulk-peaks" });

    expect(datasetNames()).toEqual(["Dataset A", "Dataset B", "Dataset C"]);
    for (const [index, item] of initialConfig.datasets.entries()) {
      expect(datasetRow(item.name)).not.toBe(rows[index]);
    }
  });
});

async function renderHarness(props: HarnessProps = {}) {
  const trackId = props.trackId ?? "bulk-peaks";
  rejectAddUpdate = props.rejectAdd ?? false;
  rejectRemoveUpdate = props.rejectRemove ?? false;
  if (!useTrackStore) {
    useTrackStore = createTrackStore({
      modules: [bulkBedModule],
      tracks: [createTrack(trackId)],
    });
    const updateTrack = useTrackStore.getState().updateTrack;
    useTrackStore.setState({
      updateTrack: (id, update) => {
        const partial = (update.config ?? {}) as Partial<BulkBedConfig>;
        const current = useTrackStore?.getState().getTrack(id)?.config as BulkBedConfig;
        const nextLength = partial.datasets?.length ?? current.datasets.length;
        if (
          (rejectAddUpdate && nextLength > current.datasets.length) ||
          (rejectRemoveUpdate && nextLength < current.datasets.length)
        ) {
          return { ok: false, error: "Rejected for test" };
        }
        return updateTrack(id, update);
      },
    });
  } else if (!useTrackStore.getState().getTrack(trackId)) {
    await act(async () => useTrackStore?.getState().addTrack(createTrack(trackId)));
  }
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  await act(async () => root?.render(<Harness {...props} />));
}

async function renderControlledSettings(
  track: TrackInstance<BulkBedConfig, BulkBedRect>,
  updateTrack: (update: TrackUpdate<BulkBedConfig, BulkBedRect>) => TrackMutationResult,
) {
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  await act(async () => root?.render(<BulkBedSettings track={track} updateTrack={updateTrack} />));
}

function createTrack(id: string) {
  return bulkBedModule.create({
    id,
    title: "BulkBed",
    config: initialConfig,
  });
}

function dataset(name: string): BulkBedDataset {
  return { name, url: "YOUR_URL_HERE" };
}

function datasetNames() {
  return textInputs()
    .filter((_, index) => index % 2 === 0)
    .map((input) => input.value);
}

function datasetRow(name: string) {
  const input = textInputs().find((candidate) => candidate.value === name);
  const row = input?.parentElement?.parentElement;
  if (!(row instanceof HTMLDivElement)) throw new Error(`Dataset row not found: ${name}`);
  return row;
}

function textInputs() {
  return Array.from(container?.querySelectorAll<HTMLInputElement>('input[type="text"]') ?? []);
}

async function updateTextInput(input: HTMLInputElement | undefined, value: string) {
  if (!input) throw new Error("Text input not found");
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) throw new Error("Could not set input value");

  await act(async () => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function expectExistingRows(rows: HTMLDivElement[]) {
  for (const [index, item] of initialConfig.datasets.entries()) {
    expect(datasetRow(item.name)).toBe(rows[index]);
  }
}

function removeButton(row: HTMLDivElement) {
  const candidate = Array.from(row.querySelectorAll("button")).find(
    (element) => element.textContent === "Remove",
  );
  if (!candidate) throw new Error("Remove button not found");
  return candidate;
}

function button(label: string) {
  const candidate = Array.from(container?.querySelectorAll("button") ?? []).find(
    (element) => element.textContent === label,
  );
  if (!candidate) throw new Error(`Button not found: ${label}`);
  return candidate;
}
