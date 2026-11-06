// @vitest-environment jsdom

import {
  createTrackStore,
  type TrackInstance,
  type TrackSettingsProps,
  type TrackStoreInstance,
} from "@weng-lab/genomebrowser";
import {
  bulkBedModule,
  type BulkBedConfig,
  type BulkBedRect,
} from "@weng-lab/genomebrowser-tracks/bulkbed";
import { act, Profiler, type ProfilerOnRenderCallback } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BulkBedSettings } from "../../src/bulkbed/settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialConfig: BulkBedConfig = {
  gap: 4,
  rowHeight: 12,
  datasets: [
    { name: "Dataset A", url: "DATASET_A_URL" },
    { name: "Dataset B", url: "DATASET_B_URL" },
  ],
};

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.useRealTimers();
});

describe("BulkBed settings", () => {
  it("renders from the fresh complete track after an unrelated base update", () => {
    let renderCount = 0;
    const { trackStore } = renderSettings(initialConfig, { onSettingsRender: () => renderCount++ });
    const initialRenderCount = renderCount;
    const initialTrack = trackStore.getState().getTrack("bulkbed");

    act(() => {
      trackStore.getState().updateTrack("bulkbed", { base: { color: "#112233" } });
    });

    const updatedTrack = trackStore.getState().getTrack("bulkbed");
    expect(updatedTrack).not.toBe(initialTrack);
    expect(updatedTrack?.base.color).toBe("#112233");
    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(datasetNames()).toEqual(["Dataset A", "Dataset B"]);
  });

  it("renders accessible controls for every BulkBed config option", () => {
    renderSettings();

    expect(container?.textContent).toContain("BulkBed");
    expect(container?.textContent).toContain("Datasets");
    expect(gapInput().value).toBe("4");
    expect(gapInput().min).toBe("0");
    expect(gapInput().step).toBe("any");
    expect(gapInput().inputMode).toBe("decimal");

    const rows = datasetRows();
    expect(rows).toHaveLength(2);
    expect(rowInput(rows[0], "Name").value).toBe("Dataset A");
    expect(rowInput(rows[0], "URL").value).toBe("DATASET_A_URL");
    expect(rowInput(rows[1], "Name").value).toBe("Dataset B");
    expect(rowInput(rows[1], "URL").value).toBe("DATASET_B_URL");
    expect(rowInput(rows[0], "Name").required).toBe(true);
    expect(rowInput(rows[0], "URL").autocomplete).toBe("url");
    expect(rowInput(rows[0], "URL").inputMode).toBe("url");
    expect(rowInput(rows[0], "URL").placeholder).toBe("YOUR_URL_HERE");
    expect(fieldContainer(rowInput(rows[0], "Name")).parentElement).toBe(
      fieldContainer(rowInput(rows[0], "URL")).parentElement,
    );
    const firstDatasetFieldRow = fieldContainer(rowInput(rows[0], "Name"))
      .parentElement as HTMLElement;
    expect(getComputedStyle(firstDatasetFieldRow).display).toBe("flex");
    expect(getComputedStyle(firstDatasetFieldRow).flexWrap).toBe("nowrap");
  });

  it("disables every dataset URL for a host source", () => {
    renderControlledSettings({ ...createBulkBedTrack(initialConfig), source: "host" }, () => ({
      ok: true,
    }));

    for (const row of datasetRows()) {
      expect(rowInput(row, "URL").disabled).toBe(true);
      expect(rowInput(row, "Name").disabled).toBe(false);
    }
    expect(gapInput().disabled).toBe(false);
  });

  it("updates gap and dataset fields without losing unaffected draft values", () => {
    vi.useFakeTimers();
    const { trackStore } = renderSettings();

    updateInput(gapInput(), "6.5");
    updateInput(rowInput(datasetRows()[1], "Name"), "Dataset B updated");
    updateInput(rowInput(datasetRows()[0], "URL"), "DATASET_A_UPDATED_URL");
    act(() => vi.advanceTimersByTime(300));
    act(() =>
      datasetRows()[0].querySelector<HTMLButtonElement>('button[aria-label="Set URL"]')?.click(),
    );

    expect(storedConfig(trackStore)).toEqual({
      ...initialConfig,
      gap: 6.5,
      datasets: [
        { name: "Dataset A", url: "DATASET_A_UPDATED_URL" },
        { name: "Dataset B updated", url: "DATASET_B_URL" },
      ],
    });
  });

  it("adds and removes datasets while retaining stable rows and one required dataset", () => {
    const { trackStore } = renderSettings({
      gap: 4,
      rowHeight: 12,
      datasets: [
        { name: "Dataset A", url: "DATASET_A_URL" },
        { name: "Dataset B", url: "DATASET_B_URL" },
        { name: "Dataset C", url: "DATASET_C_URL" },
      ],
    });

    const [firstRow, middleRow, lastRow] = datasetRows();
    click(removeButton(middleRow));
    expect(datasetNames()).toEqual(["Dataset A", "Dataset C"]);
    expect(datasetRows()[0]).toBe(firstRow);
    expect(datasetRows()[1]).toBe(lastRow);
    expect(container?.contains(middleRow)).toBe(false);

    click(addButton());
    expect(datasetNames()).toEqual(["Dataset A", "Dataset C", "Dataset 3"]);
    expect(rowInput(datasetRows()[2], "URL").value).toBe("YOUR_URL_HERE");
    expect(datasetRows()[0]).toBe(firstRow);
    expect(datasetRows()[1]).toBe(lastRow);
    expect(storedConfig(trackStore).datasets).toEqual([
      { name: "Dataset A", url: "DATASET_A_URL" },
      { name: "Dataset C", url: "DATASET_C_URL" },
      { name: "Dataset 3", url: "YOUR_URL_HERE" },
    ]);

    click(removeButton(datasetRows()[2]));
    click(removeButton(datasetRows()[1]));
    expect(datasetNames()).toEqual(["Dataset A"]);
    expect(removeButton(datasetRows()[0]).disabled).toBe(true);
  });

  it("preserves invalid drafts through controlled prop reconciliation", () => {
    const { rerender, updateTrack } = renderSettings();

    updateInput(rowInput(datasetRows()[0], "Name"), "");
    updateInput(rowInput(datasetRows()[0], "URL"), "");
    updateInput(gapInput(), "-2");

    expect(updateTrack).not.toHaveBeenCalled();
    expect(container?.textContent).toContain("Enter a non-negative number.");
    expect(container?.textContent).toContain("Enter a dataset name.");
    expect(container?.textContent).toContain("Enter a URL.");

    rerender({ ...initialConfig, gap: 8 });

    expect(gapInput().value).toBe("-2");
    expect(rowInput(datasetRows()[0], "Name").value).toBe("");
    expect(rowInput(datasetRows()[0], "URL").value).toBe("");
  });

  it("keeps a core-rejected complete draft visible", () => {
    vi.useFakeTimers();
    const { rerender } = renderSettings(initialConfig, { reject: true });

    updateInput(rowInput(datasetRows()[0], "Name"), "Dataset A updated");
    act(() => vi.advanceTimersByTime(300));
    rerender({ ...initialConfig });

    expect(rowInput(datasetRows()[0], "Name").value).toBe("Dataset A updated");
    expect(container?.textContent).toContain("Core rejected the update.");
  });

  it("reconciles externally controlled datasets without remounting unaffected rows", () => {
    const { rerender } = renderSettings();
    const [firstRow, secondRow] = datasetRows();

    rerender({
      gap: 8,
      rowHeight: 12,
      datasets: [
        { name: "Dataset A", url: "EXTERNAL_A_URL" },
        { name: "Dataset B", url: "DATASET_B_URL" },
        { name: "External dataset", url: "EXTERNAL_URL" },
      ],
    });

    const [, , externalRow] = datasetRows();
    expect(gapInput().value).toBe("8");
    expect(rowInput(datasetRows()[0], "URL").value).toBe("EXTERNAL_A_URL");
    expect(datasetRows()[0]).toBe(firstRow);
    expect(datasetRows()[1]).toBe(secondRow);

    rerender({
      gap: 8,
      rowHeight: 12,
      datasets: [
        { name: "Dataset A", url: "EXTERNAL_A_URL" },
        { name: "External dataset", url: "EXTERNAL_URL" },
      ],
    });

    expect(datasetRows()[0]).toBe(firstRow);
    expect(datasetRows()[1]).toBe(externalRow);
  });

  it("resets row ownership when the track id changes with the same datasets reference", () => {
    const baselineTrack = createBulkBedTrack(initialConfig);
    const replacementTrack = {
      ...baselineTrack,
      base: { ...baselineTrack.base, id: "replacement-bulkbed" },
    };
    renderControlledSettings(baselineTrack, () => ({ ok: true }));
    const rows = datasetRows();
    renderControlledSettings(replacementTrack, () => ({ ok: true }));

    expect(datasetNames()).toEqual(["Dataset A", "Dataset B"]);
    expect(datasetRows()[0]).not.toBe(rows[0]);
    expect(datasetRows()[1]).not.toBe(rows[1]);
  });
});

type UpdateTrack = TrackSettingsProps<BulkBedConfig, BulkBedRect>["updateTrack"];

function renderSettings(
  config = initialConfig,
  {
    reject = false,
    onSettingsRender = () => undefined,
  }: { reject?: boolean; onSettingsRender?: ProfilerOnRenderCallback } = {},
) {
  mount();
  const trackStore = createBulkBedStore(config);
  const updateTrack = vi.fn<UpdateTrack>((update) =>
    reject
      ? { ok: false, code: "INVALID_TRACK", error: "Core rejected the update." }
      : trackStore.getState().updateTrack("bulkbed", update),
  );

  const rerender = (nextConfig: BulkBedConfig) => {
    act(() => {
      trackStore.getState().updateTrack<BulkBedConfig>("bulkbed", { config: nextConfig });
    });
  };

  act(() => {
    root?.render(
      <Profiler id="bulkbed-settings" onRender={onSettingsRender}>
        <BulkBedSettingsHarness trackStore={trackStore} updateTrack={updateTrack} />
      </Profiler>,
    );
  });
  return { rerender, trackStore, updateTrack };
}

function storedConfig(trackStore: TrackStoreInstance) {
  return trackStore.getState().getTrack("bulkbed")?.config as BulkBedConfig;
}

function BulkBedSettingsHarness({
  trackStore,
  updateTrack,
}: {
  trackStore: TrackStoreInstance;
  updateTrack: UpdateTrack;
}) {
  const track = trackStore((state) => state.getTrack("bulkbed")) as
    | TrackInstance<BulkBedConfig, BulkBedRect>
    | undefined;
  if (!track) throw new Error("BulkBed track not found");
  return (
    <BulkBedSettings
      displayOptions={["full"]}
      updateTracksOfType={() => ({ ok: true })}
      track={track}
      updateTrack={updateTrack}
    />
  );
}

function createBulkBedStore(config: BulkBedConfig) {
  return createTrackStore({
    modules: [bulkBedModule],
    tracks: [createBulkBedTrack(config)],
  });
}

function createBulkBedTrack(config: BulkBedConfig, id = "bulkbed") {
  return bulkBedModule.create({
    base: {
      id,
      title: "BulkBed",
      height: 80,
      color: "#4b9560",
    },
    config,
  });
}

function mount() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
}

function renderControlledSettings(
  track: TrackInstance<BulkBedConfig, BulkBedRect>,
  updateTrack: UpdateTrack,
) {
  if (!root) mount();
  act(() =>
    root?.render(
      <BulkBedSettings
        displayOptions={["full"]}
        updateTracksOfType={() => ({ ok: true })}
        track={track}
        updateTrack={updateTrack}
      />,
    ),
  );
}

function gapInput() {
  const input = Array.from(container?.querySelectorAll<HTMLInputElement>("input") ?? []).find(
    (candidate) => Array.from(candidate.labels ?? []).some((label) => label.textContent === "Gap"),
  );
  if (!input) throw new Error("Could not find the gap input");
  return input;
}

function datasetRows() {
  return Array.from(
    container?.querySelectorAll<HTMLElement>('section[aria-label^="Dataset "]') ?? [],
  );
}

function rowInput(row: HTMLElement, label: string) {
  const input = Array.from(row.querySelectorAll<HTMLInputElement>("input")).find((candidate) =>
    Array.from(candidate.labels ?? []).some(
      (candidateLabel) => candidateLabel.textContent?.replace(/\s*\*$/, "").trim() === label,
    ),
  );
  if (!input) throw new Error(`Could not find ${label} input`);
  return input;
}

function fieldContainer(input: HTMLInputElement) {
  const field = input.closest<HTMLElement>(".MuiFormControl-root");
  if (!field) throw new Error("Could not find field container");
  return input.type === "url" ? field.parentElement! : field;
}

function datasetNames() {
  return datasetRows().map((row) => rowInput(row, "Name").value);
}

function addButton() {
  const button = Array.from(container?.querySelectorAll("button") ?? []).find(
    (candidate) => candidate.textContent === "Add dataset",
  );
  if (!button) throw new Error("Could not find the add dataset button");
  return button;
}

function removeButton(row: HTMLElement) {
  const button = Array.from(row.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === "Remove",
  );
  if (!button) throw new Error("Could not find a remove dataset button");
  return button;
}

function updateInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) throw new Error("Could not set input value");

  act(() => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function click(element: HTMLElement) {
  act(() => element.click());
}
