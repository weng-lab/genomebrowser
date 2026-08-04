// @vitest-environment jsdom

import {
  bulkBedModule,
  type BulkBedConfig,
  type TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bulkBedModuleWithSettings } from "../src/tracks/bulkbed/module";
import { BulkBedSettings } from "../src/tracks/bulkbed/settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialConfig: BulkBedConfig = {
  gap: 4,
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
});

describe("BulkBed settings", () => {
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
  });

  it("updates gap and dataset fields without losing unaffected draft values", () => {
    const { updateConfig } = renderSettings();

    updateInput(gapInput(), "6.5");
    updateInput(rowInput(datasetRows()[1], "Name"), "Dataset B updated");
    updateInput(rowInput(datasetRows()[0], "URL"), "DATASET_A_UPDATED_URL");

    expect(updateConfig.mock.calls).toEqual([
      [{ gap: 6.5 }],
      [
        {
          datasets: [
            { name: "Dataset A", url: "DATASET_A_URL" },
            { name: "Dataset B updated", url: "DATASET_B_URL" },
          ],
        },
      ],
      [
        {
          datasets: [
            { name: "Dataset A", url: "DATASET_A_UPDATED_URL" },
            { name: "Dataset B updated", url: "DATASET_B_URL" },
          ],
        },
      ],
    ]);
  });

  it("adds and removes datasets while retaining stable rows and one required dataset", () => {
    const updateConfig = vi.fn<(partial: Partial<BulkBedConfig>) => void>();
    renderStatefulSettings(
      {
        gap: 4,
        datasets: [
          { name: "Dataset A", url: "DATASET_A_URL" },
          { name: "Dataset B", url: "DATASET_B_URL" },
          { name: "Dataset C", url: "DATASET_C_URL" },
        ],
      },
      updateConfig,
    );

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

    click(removeButton(datasetRows()[2]));
    click(removeButton(datasetRows()[1]));
    expect(datasetNames()).toEqual(["Dataset A"]);
    expect(removeButton(datasetRows()[0]).disabled).toBe(true);
    expect(updateConfig).toHaveBeenCalledWith({
      datasets: [
        { name: "Dataset A", url: "DATASET_A_URL" },
        { name: "Dataset C", url: "DATASET_C_URL" },
        { name: "Dataset 3", url: "YOUR_URL_HERE" },
      ],
    });
  });

  it("preserves invalid drafts through controlled prop reconciliation", () => {
    const { rerender, updateConfig } = renderSettings();

    updateInput(rowInput(datasetRows()[0], "Name"), "");
    updateInput(rowInput(datasetRows()[0], "URL"), "");
    updateInput(gapInput(), "-2");
    click(addButton());

    expect(updateConfig).not.toHaveBeenCalled();
    expect(datasetRows()).toHaveLength(3);
    expect(container?.textContent).toContain("Enter a non-negative number.");
    expect(container?.textContent).toContain("Enter a dataset name.");
    expect(container?.textContent).toContain("Enter a dataset URL.");

    rerender({ ...initialConfig, gap: 8 });

    expect(gapInput().value).toBe("-2");
    expect(rowInput(datasetRows()[0], "Name").value).toBe("");
    expect(rowInput(datasetRows()[0], "URL").value).toBe("");
    expect(rowInput(datasetRows()[2], "Name").value).toBe("Dataset 3");
  });

  it("keeps a core-rejected complete draft visible", () => {
    const updateConfig = vi.fn<TrackSettingsProps<BulkBedConfig>["updateConfig"]>(() => ({
      ok: false,
      error: "Core rejected the update.",
    }));
    const { rerender } = renderSettings(initialConfig, updateConfig);

    updateInput(rowInput(datasetRows()[0], "Name"), "Dataset A updated");
    rerender({ ...initialConfig });

    expect(rowInput(datasetRows()[0], "Name").value).toBe("Dataset A updated");
    expect(container?.textContent).toContain("Core rejected the update.");
  });

  it("reconciles externally controlled datasets without remounting unaffected rows", () => {
    const { rerender } = renderSettings();
    const [firstRow, secondRow] = datasetRows();

    rerender({
      gap: 8,
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
      datasets: [
        { name: "Dataset A", url: "EXTERNAL_A_URL" },
        { name: "External dataset", url: "EXTERNAL_URL" },
      ],
    });

    expect(datasetRows()[0]).toBe(firstRow);
    expect(datasetRows()[1]).toBe(externalRow);
  });
});

describe("BulkBed module with settings", () => {
  it("directly extends the core module with the UI settings component", () => {
    expect(bulkBedModuleWithSettings).not.toBe(bulkBedModule);
    expect(bulkBedModuleWithSettings.create).toBe(bulkBedModule.create);
    expect(bulkBedModuleWithSettings.settingsComponent).toBe(BulkBedSettings);
    expect(bulkBedModule.settingsComponent).not.toBe(BulkBedSettings);
  });
});

function StatefulSettings({
  initialConfig,
  onUpdate,
}: {
  initialConfig: BulkBedConfig;
  onUpdate: (partial: Partial<BulkBedConfig>) => void;
}) {
  const [config, setConfig] = useState(initialConfig);

  const updateConfig: TrackSettingsProps<BulkBedConfig>["updateConfig"] = (partial) => {
    onUpdate(partial);
    setConfig((current) => ({ ...current, ...partial }));
    return { ok: true };
  };

  return <BulkBedSettings id="bulkbed" config={config} updateConfig={updateConfig} />;
}

function renderSettings(
  config = initialConfig,
  updateConfig = vi.fn<TrackSettingsProps<BulkBedConfig>["updateConfig"]>(() => ({ ok: true })),
) {
  mount();

  const rerender = (nextConfig: BulkBedConfig) => {
    act(() => {
      root?.render(
        <BulkBedSettings id="bulkbed" config={nextConfig} updateConfig={updateConfig} />,
      );
    });
  };

  rerender(config);
  return { rerender, updateConfig };
}

function renderStatefulSettings(
  config: BulkBedConfig,
  onUpdate: (partial: Partial<BulkBedConfig>) => void,
) {
  mount();
  act(() => {
    root?.render(<StatefulSettings initialConfig={config} onUpdate={onUpdate} />);
  });
}

function mount() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
}

function gapInput() {
  const input = container?.querySelector<HTMLInputElement>('input[type="number"]');
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
