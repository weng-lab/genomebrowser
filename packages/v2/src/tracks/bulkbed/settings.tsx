import type { CSSProperties } from "react";
import { useRef } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { BulkBedConfig, BulkBedDataset } from "./types";

export function BulkBedSettings({ config, updateTrack }: TrackSettingsProps<BulkBedConfig>) {
  const datasetKeys = useRef<string[]>([]);
  while (datasetKeys.current.length < config.datasets.length)
    datasetKeys.current.push(crypto.randomUUID());
  if (datasetKeys.current.length > config.datasets.length) {
    datasetKeys.current = datasetKeys.current.slice(0, config.datasets.length);
  }

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
            if (Number.isFinite(gap) && gap >= 0) updateTrack({ gap });
          }}
        />
      </label>
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ fontWeight: 600 }}>Datasets</div>
        {config.datasets.map((dataset, index) => (
          <div key={datasetKeys.current[index]} style={datasetStyle}>
            <label style={fieldStyle}>
              Name
              <input
                type="text"
                value={dataset.name}
                onChange={(event) =>
                  updateTrack({
                    datasets: updateDataset(config.datasets, index, "name", event.target.value),
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
                    datasets: updateDataset(config.datasets, index, "url", event.target.value),
                  })
                }
              />
            </label>
            <button
              type="button"
              disabled={config.datasets.length === 1}
              onClick={() => {
                datasetKeys.current = datasetKeys.current.filter(
                  (_, datasetIndex) => datasetIndex !== index,
                );
                updateTrack({
                  datasets: config.datasets.filter((_, datasetIndex) => datasetIndex !== index),
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
              datasetKeys.current.push(crypto.randomUUID());
              updateTrack({
                datasets: [
                  ...config.datasets,
                  { name: `Dataset ${config.datasets.length + 1}`, url: "YOUR_URL_HERE" },
                ],
              });
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
