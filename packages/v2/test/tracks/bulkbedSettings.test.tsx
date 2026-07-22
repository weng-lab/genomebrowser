// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrackMutationResult } from "../../src/modules/types";
import { BulkBedSettings } from "../../src/tracks/bulkbed/settings";
import type { BulkBedConfig, BulkBedDataset } from "../../src/tracks/bulkbed/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialConfig: BulkBedConfig = {
  datasets: [dataset("Dataset A"), dataset("Dataset B"), dataset("Dataset C")],
};

type HarnessProps = {
  rejectAdd?: boolean;
  rejectRemove?: boolean;
  trackId?: string;
};

let container: HTMLDivElement | undefined;
let root: Root | undefined;

function Harness({
  rejectAdd = false,
  rejectRemove = false,
  trackId = "bulk-peaks",
}: HarnessProps) {
  const [config, setConfig] = useState(initialConfig);

  const updateConfig = (partial: Partial<BulkBedConfig>): TrackMutationResult => {
    const nextLength = partial.datasets?.length ?? config.datasets.length;
    if (
      (rejectAdd && nextLength > config.datasets.length) ||
      (rejectRemove && nextLength < config.datasets.length)
    ) {
      return { ok: false, error: "Rejected for test" };
    }
    setConfig((current) => ({ ...current, ...partial }));
    return { ok: true };
  };

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setConfig((current) => ({
            ...current,
            datasets: [
              ...current.datasets,
              dataset(`External ${current.datasets.length + 1}`),
              dataset(`External ${current.datasets.length + 2}`),
            ],
          }))
        }
      >
        Append externally
      </button>
      <button
        type="button"
        onClick={() =>
          setConfig((current) => ({ ...current, datasets: current.datasets.slice(0, 2) }))
        }
      >
        Shorten externally
      </button>
      <BulkBedSettings id={trackId} config={config} updateConfig={updateConfig} />
    </>
  );
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.restoreAllMocks();
});

describe("BulkBed settings", () => {
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
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  await act(async () => root?.render(<Harness {...props} />));
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
