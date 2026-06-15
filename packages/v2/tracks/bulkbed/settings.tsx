import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import type { TrackSettingsProps } from "../../src/modules/types";
import { SettingsSection } from "../../src/settings/SettingsSection";
import type { BulkBedConfig, BulkBedDataset } from "./types";

export function BulkBedSettings({ config, updateTrack }: TrackSettingsProps<BulkBedConfig>) {
  const [datasets, setDatasets] = useState(config.datasets);
  const previousDatasets = useRef(config.datasets);

  if (config.datasets !== previousDatasets.current) {
    previousDatasets.current = config.datasets;
    setDatasets(config.datasets);
  }

  const sanitizedDatasets = datasets.map((dataset) => ({
    name: dataset.name.trim(),
    url: dataset.url.trim(),
  }));
  const invalidDatasets =
    sanitizedDatasets.length === 0 ||
    sanitizedDatasets.some((dataset) => dataset.name === "" || dataset.url === "");

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
        {datasets.map((dataset, index) => (
          <div key={index} style={datasetStyle}>
            <label style={fieldStyle}>
              Name
              <input
                type="text"
                value={dataset.name}
                onChange={(event) =>
                  updateDataset(datasets, setDatasets, index, "name", event.target.value)
                }
              />
            </label>
            <label style={fieldStyle}>
              URL
              <input
                type="text"
                value={dataset.url}
                onChange={(event) =>
                  updateDataset(datasets, setDatasets, index, "url", event.target.value)
                }
              />
            </label>
            <button
              type="button"
              disabled={datasets.length === 1}
              onClick={() =>
                setDatasets(datasets.filter((_, datasetIndex) => datasetIndex !== index))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() =>
              setDatasets([
                ...datasets,
                { name: `Dataset ${datasets.length + 1}`, url: "YOUR_URL_HERE" },
              ])
            }
          >
            Add dataset
          </button>
          <button
            type="button"
            disabled={invalidDatasets}
            onClick={() => updateTrack({ datasets: sanitizedDatasets })}
          >
            Apply datasets
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
  setDatasets: (datasets: BulkBedDataset[]) => void,
  index: number,
  key: keyof BulkBedDataset,
  value: string,
) {
  setDatasets(
    datasets.map((dataset, datasetIndex) =>
      datasetIndex === index ? { ...dataset, [key]: value } : dataset,
    ),
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
