import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { BulkBedConfig, BulkBedDataset, BulkBedRect } from "./types";

export function BulkBedSettings({
  track,
  updateTrack,
}: TrackSettingsProps<BulkBedConfig, BulkBedRect>) {
  const { config } = track;
  const id = track.base.id;
  const [datasetKeyState, setDatasetKeyState] = useState(() =>
    createDatasetKeyState(id, config.datasets.length),
  );
  const renderedKeyState = reconcileDatasetKeys(datasetKeyState, id, config.datasets.length);

  useEffect(() => {
    setDatasetKeyState((current) => reconcileDatasetKeys(current, id, config.datasets.length));
  }, [id, config.datasets.length]);

  const invalidDatasets =
    config.datasets.length === 0 ||
    config.datasets.some((dataset) => dataset.name.trim() === "" || dataset.url.trim() === "");

  return (
    <SettingsSection title="BulkBed">
      <label style={fieldStyle}>
        Gap
        <input
          type="number"
          min={0}
          step={1}
          value={config.gap ?? 0}
          onChange={(event) => {
            const gap = Number(event.target.value);
            if (Number.isFinite(gap) && gap >= 0) updateTrack({ config: { gap } });
          }}
        />
      </label>
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ fontWeight: 600 }}>Datasets</div>
        {config.datasets.map((dataset, index) => (
          <div key={renderedKeyState.keys[index]} style={datasetStyle}>
            <label style={fieldStyle}>
              Name
              <input
                type="text"
                value={dataset.name}
                onChange={(event) =>
                  updateTrack({
                    config: {
                      datasets: updateDataset(config.datasets, index, "name", event.target.value),
                    },
                  })
                }
              />
            </label>
            <label style={fieldStyle}>
              URL
              <input
                type="text"
                value={dataset.url}
                onChange={(event) =>
                  updateTrack({
                    config: {
                      datasets: updateDataset(config.datasets, index, "url", event.target.value),
                    },
                  })
                }
              />
            </label>
            <button
              type="button"
              disabled={config.datasets.length === 1}
              onClick={() => {
                const result = updateTrack({
                  config: {
                    datasets: config.datasets.filter((_, datasetIndex) => datasetIndex !== index),
                  },
                });
                if (result.ok) {
                  setDatasetKeyState((current) => {
                    const reconciled = reconcileDatasetKeys(current, id, config.datasets.length);
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
              const result = updateTrack({
                config: {
                  datasets: [
                    ...config.datasets,
                    { name: `Dataset ${config.datasets.length + 1}`, url: "YOUR_URL_HERE" },
                  ],
                },
              });
              if (result.ok) {
                setDatasetKeyState((current) => {
                  const reconciled = reconcileDatasetKeys(current, id, config.datasets.length);
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
        {invalidDatasets && (
          <div style={{ color: "#b00020" }}>Dataset names and URLs are required.</div>
        )}
      </div>
    </SettingsSection>
  );
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

function updateDataset(
  datasets: BulkBedDataset[],
  index: number,
  key: keyof BulkBedDataset,
  value: string,
) {
  return datasets.map((dataset, datasetIndex) =>
    datasetIndex === index ? { ...dataset, [key]: value } : dataset,
  );
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
