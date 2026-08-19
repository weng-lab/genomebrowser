import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackMutationResult, TrackSettingsProps } from "../../modules/types";
import type { BulkBedConfig, BulkBedDataset, BulkBedRect } from "./types";

type BulkBedSettingsProps = TrackSettingsProps<BulkBedConfig, BulkBedRect>;
type DatasetEdit =
  | { type: "add"; dataset: BulkBedDataset }
  | { type: "remove"; index: number }
  | { type: "field"; index: number; field: keyof BulkBedDataset; value: string };

type PendingDatasetEdits = {
  source: BulkBedDataset[];
  edits: DatasetEdit[];
};

export function BulkBedSettings({ track, updateTrack }: BulkBedSettingsProps) {
  return (
    <SettingsSection title="BulkBed">
      <GapField gap={track.config.gap} updateTrack={updateTrack} />
      <DatasetsFields
        datasets={track.config.datasets}
        id={track.base.id}
        updateTrack={updateTrack}
      />
    </SettingsSection>
  );
}

function GapField({
  gap,
  updateTrack,
}: {
  gap: number | undefined;
  updateTrack: BulkBedSettingsProps["updateTrack"];
}) {
  return (
    <label style={fieldStyle}>
      Gap
      <input
        type="number"
        min={0}
        step={1}
        value={gap ?? 0}
        onChange={(event) => {
          const nextGap = event.currentTarget.valueAsNumber;
          if (Number.isFinite(nextGap) && nextGap >= 0) {
            updateTrack({ config: { gap: nextGap } });
          }
        }}
      />
    </label>
  );
}

function DatasetsFields({
  datasets,
  id,
  updateTrack,
}: {
  datasets: BulkBedDataset[];
  id: string;
  updateTrack: BulkBedSettingsProps["updateTrack"];
}) {
  const [pendingEdits, setPendingEdits] = useState<PendingDatasetEdits>();
  const activeEdits = pendingEdits?.source === datasets ? pendingEdits.edits : [];
  const currentDatasets = applyDatasetEdits(datasets, activeEdits);
  const datasetCount = currentDatasets.length;
  const [datasetKeyState, setDatasetKeyState] = useState(() =>
    createDatasetKeyState(id, datasetCount),
  );
  const renderedKeyState = reconcileDatasetKeys(datasetKeyState, id, datasetCount);

  useEffect(() => {
    setDatasetKeyState((current) => reconcileDatasetKeys(current, id, datasetCount));
  }, [id, datasetCount]);

  const commitDatasetEdit = (edit: DatasetEdit, onAccepted?: () => void) => {
    const nextDatasets = applyDatasetEdit(currentDatasets, edit);
    const result = updateTrack({ config: { datasets: nextDatasets } });
    if (result.ok) {
      flushSync(() => {
        setPendingEdits({ source: datasets, edits: [...activeEdits, edit] });
        onAccepted?.();
      });
    }
    return result;
  };

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ fontWeight: 600 }}>Datasets</div>
      {Array.from({ length: datasetCount }, (_, index) => (
        <div key={renderedKeyState.keys[index]} style={datasetStyle}>
          <DatasetField
            datasets={currentDatasets}
            index={index}
            field="name"
            label="Name"
            commitDatasetEdit={commitDatasetEdit}
          />
          <DatasetField
            datasets={currentDatasets}
            index={index}
            field="url"
            label="URL"
            commitDatasetEdit={commitDatasetEdit}
          />
          <button
            type="button"
            disabled={datasetCount === 1}
            onClick={() => {
              commitDatasetEdit({ type: "remove", index }, () => {
                setDatasetKeyState((current) => {
                  const reconciled = reconcileDatasetKeys(current, id, datasetCount);
                  return {
                    ...reconciled,
                    keys: reconciled.keys.filter((_, datasetIndex) => datasetIndex !== index),
                  };
                });
              });
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          type="button"
          onClick={() => {
            commitDatasetEdit(
              {
                type: "add",
                dataset: {
                  name: `Dataset ${currentDatasets.length + 1}`,
                  url: "YOUR_URL_HERE",
                },
              },
              () => {
                setDatasetKeyState((current) => {
                  const reconciled = reconcileDatasetKeys(current, id, datasetCount);
                  return {
                    ...reconciled,
                    keys: [...reconciled.keys, datasetKey(reconciled.id, reconciled.nextKey)],
                    nextKey: reconciled.nextKey + 1,
                  };
                });
              },
            );
          }}
        >
          Add dataset
        </button>
      </div>
      <DatasetValidationMessage datasets={currentDatasets} />
    </div>
  );
}

function DatasetField({
  datasets,
  field,
  index,
  label,
  commitDatasetEdit,
}: {
  datasets: BulkBedDataset[];
  field: keyof BulkBedDataset;
  index: number;
  label: string;
  commitDatasetEdit: (edit: DatasetEdit) => TrackMutationResult;
}) {
  const value = datasets[index]?.[field] ?? "";

  return (
    <label style={fieldStyle}>
      {label}
      <input
        type="text"
        value={value}
        onChange={(event) => {
          commitDatasetEdit({ type: "field", index, field, value: event.target.value });
        }}
      />
    </label>
  );
}

function applyDatasetEdits(datasets: BulkBedDataset[], edits: DatasetEdit[]) {
  return edits.reduce(applyDatasetEdit, datasets);
}

function applyDatasetEdit(datasets: BulkBedDataset[], edit: DatasetEdit): BulkBedDataset[] {
  switch (edit.type) {
    case "add":
      return [...datasets, edit.dataset];
    case "remove":
      return datasets.filter((_, index) => index !== edit.index);
    case "field":
      return datasets.map((dataset, index) =>
        index === edit.index ? { ...dataset, [edit.field]: edit.value } : dataset,
      );
  }
}

function DatasetValidationMessage({ datasets }: { datasets: BulkBedDataset[] }) {
  const invalidDatasets =
    datasets.length === 0 ||
    datasets.some((dataset) => dataset.name.trim() === "" || dataset.url.trim() === "");

  return invalidDatasets ? (
    <div style={{ color: "#b00020" }}>Dataset names and URLs are required.</div>
  ) : null;
}

type DatasetKeyState = {
  id: string;
  keys: string[];
  nextKey: number;
};

function createDatasetKeyState(id: string, count: number): DatasetKeyState {
  return {
    id,
    keys: Array.from({ length: count }, (_, index) => datasetKey(id, index)),
    nextKey: count,
  };
}

function reconcileDatasetKeys(state: DatasetKeyState, id: string, count: number) {
  if (state.id !== id) return createDatasetKeyState(id, count);
  if (state.keys.length === count) return state;
  if (state.keys.length > count) return { ...state, keys: state.keys.slice(0, count) };

  const addedCount = count - state.keys.length;
  return {
    ...state,
    keys: [
      ...state.keys,
      ...Array.from({ length: addedCount }, (_, index) => datasetKey(id, state.nextKey + index)),
    ],
    nextKey: state.nextKey + addedCount,
  };
}

function datasetKey(id: string, sequence: number) {
  return `bulkbed-dataset-${id}-${sequence}`;
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;

const datasetStyle = {
  display: "grid",
  gap: "6px",
  padding: "8px",
  border: "1px solid #d0d0d0",
  borderRadius: "4px",
} satisfies CSSProperties;
