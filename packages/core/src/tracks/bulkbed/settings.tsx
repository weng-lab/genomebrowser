import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import {
  useSettingsStore,
  useTrackStore,
  useTrackStoreApi,
} from "../../browser/state/browserContextState";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { BulkBedConfig, BulkBedDataset } from "./types";

export function BulkBedSettings() {
  return (
    <SettingsSection title="BulkBed">
      <GapField />
      <DatasetsFields />
    </SettingsSection>
  );
}

function GapField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const gap = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BulkBedConfig | undefined)?.gap,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);

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
            updateTrack(trackId, { config: { gap: nextGap } });
          }
        }}
      />
    </label>
  );
}

function DatasetsFields() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const datasetCount = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BulkBedConfig | undefined)?.datasets.length ?? 0,
  );
  const trackStore = useTrackStoreApi();
  const [datasetKeyState, setDatasetKeyState] = useState(() =>
    createDatasetKeyState(trackId, datasetCount),
  );
  const renderedKeyState = reconcileDatasetKeys(datasetKeyState, trackId, datasetCount);

  useEffect(() => {
    setDatasetKeyState((current) => reconcileDatasetKeys(current, trackId, datasetCount));
  }, [trackId, datasetCount]);

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ fontWeight: 600 }}>Datasets</div>
      {Array.from({ length: datasetCount }, (_, index) => (
        <div key={renderedKeyState.keys[index]} style={datasetStyle}>
          <DatasetField index={index} field="name" label="Name" />
          <DatasetField index={index} field="url" label="URL" />
          <button
            type="button"
            disabled={datasetCount === 1}
            onClick={() => {
              const state = trackStore.getState();
              const datasets = (state.getTrack(trackId)!.config as BulkBedConfig).datasets;
              const result = state.updateTrack(trackId, {
                config: {
                  datasets: datasets.filter((_, datasetIndex) => datasetIndex !== index),
                },
              });
              if (result.ok) {
                setDatasetKeyState((current) => {
                  const reconciled = reconcileDatasetKeys(current, trackId, datasetCount);
                  return {
                    ...reconciled,
                    keys: reconciled.keys.filter((_, datasetIndex) => datasetIndex !== index),
                  };
                });
              }
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
            const state = trackStore.getState();
            const datasets = (state.getTrack(trackId)!.config as BulkBedConfig).datasets;
            const result = state.updateTrack(trackId, {
              config: {
                datasets: [
                  ...datasets,
                  { name: `Dataset ${datasets.length + 1}`, url: "YOUR_URL_HERE" },
                ],
              },
            });
            if (result.ok) {
              setDatasetKeyState((current) => {
                const reconciled = reconcileDatasetKeys(current, trackId, datasetCount);
                return {
                  ...reconciled,
                  keys: [...reconciled.keys, datasetKey(reconciled.id, reconciled.nextKey)],
                  nextKey: reconciled.nextKey + 1,
                };
              });
            }
          }}
        >
          Add dataset
        </button>
      </div>
      <DatasetValidationMessage />
    </div>
  );
}

function DatasetField({
  field,
  index,
  label,
}: {
  field: keyof BulkBedDataset;
  index: number;
  label: string;
}) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const value = useTrackStore(
    (state) =>
      (state.getTrack(trackId)?.config as BulkBedConfig | undefined)?.datasets[index]?.[field] ??
      "",
  );
  const trackStore = useTrackStoreApi();

  return (
    <label style={fieldStyle}>
      {label}
      <input
        type="text"
        value={value}
        onChange={(event) => {
          const state = trackStore.getState();
          const datasets = (state.getTrack(trackId)!.config as BulkBedConfig).datasets;
          state.updateTrack(trackId, {
            config: {
              datasets: datasets.map((dataset, datasetIndex) =>
                datasetIndex === index ? { ...dataset, [field]: event.target.value } : dataset,
              ),
            },
          });
        }}
      />
    </label>
  );
}

function DatasetValidationMessage() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const invalidDatasets = useTrackStore((state) => {
    const datasets = (state.getTrack(trackId)?.config as BulkBedConfig | undefined)?.datasets ?? [];
    return (
      datasets.length === 0 ||
      datasets.some((dataset) => dataset.name.trim() === "" || dataset.url.trim() === "")
    );
  });

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
