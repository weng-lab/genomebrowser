import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type {
  BulkBedConfig,
  BulkBedDataset,
  TrackMutationResult,
  TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { useEffect, useRef, useState } from "react";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
} from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsNumberField } from "../../TrackSettings/trackSettingsNumberField";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSettingsTextField } from "../../TrackSettings/trackSettingsTextField";
import { TrackSettingsUrlField } from "../../TrackSettings/trackSettingsUrlField";

type DatasetField = keyof BulkBedDataset;

type DatasetRow = {
  key: string;
  values: BulkBedDataset;
};

type DatasetRows = {
  nextDatasetKey: number;
  rows: DatasetRow[];
  source: BulkBedDataset[];
};

export function BulkBedSettings(props: TrackSettingsProps<BulkBedConfig>) {
  return <BulkBedSettingsEditor key={props.id} {...props} />;
}

function BulkBedSettingsEditor({ id, config, updateConfig }: TrackSettingsProps<BulkBedConfig>) {
  const [datasetRows, setDatasetRows] = useState(() => createDatasetRows(config.datasets, id));
  const committedConfigRef = useRef(config);
  const [topologyError, setTopologyError] = useState<string>();

  useEffect(() => {
    committedConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    setDatasetRows((currentRows) =>
      currentRows.source === config.datasets
        ? currentRows
        : reconcileDatasetRows(currentRows, config.datasets, id),
    );
  }, [config.datasets, id]);

  const applyConfig = (partial: Partial<BulkBedConfig>) => {
    const result = updateConfig(partial);
    if (result.ok) {
      committedConfigRef.current = { ...committedConfigRef.current, ...partial };
    }
    return result;
  };

  const commitDatasetField = (
    key: string,
    field: DatasetField,
    value: string,
  ): TrackMutationResult => {
    const datasetIndex = datasetRows.rows.findIndex((dataset) => dataset.key === key);
    if (datasetIndex === -1) return { ok: false, error: "Dataset is no longer available." };

    const currentConfig = committedConfigRef.current;
    const datasets = currentConfig.datasets.map((dataset, index) =>
      index === datasetIndex ? { ...dataset, [field]: value } : dataset,
    );
    const result = applyConfig({ datasets });
    if (result.ok) {
      setDatasetRows((currentRows) => ({
        ...currentRows,
        rows: currentRows.rows.map((dataset) =>
          dataset.key === key
            ? {
                ...dataset,
                values: { ...dataset.values, [field]: value },
              }
            : dataset,
        ),
      }));
    }
    return result;
  };

  const addDataset = () => {
    const nextDataset: BulkBedDataset = {
      name: `Dataset ${datasetRows.rows.length + 1}`,
      url: "YOUR_URL_HERE",
    };
    const result = applyConfig({
      datasets: [...committedConfigRef.current.datasets, nextDataset],
    });
    if (!result.ok) {
      setTopologyError(result.error);
      return;
    }

    setTopologyError(undefined);
    setDatasetRows((currentRows) => ({
      ...currentRows,
      nextDatasetKey: currentRows.nextDatasetKey + 1,
      rows: [
        ...currentRows.rows,
        makeDatasetRow(datasetKey(id, currentRows.nextDatasetKey), nextDataset),
      ],
    }));
  };

  const removeDataset = (key: string) => {
    const datasetIndex = datasetRows.rows.findIndex((dataset) => dataset.key === key);
    const currentConfig = committedConfigRef.current;
    if (datasetIndex === -1 || currentConfig.datasets.length <= 1) return;

    const result = applyConfig({
      datasets: currentConfig.datasets.filter((_, index) => index !== datasetIndex),
    });
    if (!result.ok) {
      setTopologyError(result.error);
      return;
    }

    setTopologyError(undefined);
    setDatasetRows((currentRows) => ({
      ...currentRows,
      rows: currentRows.rows.filter((dataset) => dataset.key !== key),
    }));
  };

  return (
    <TrackSettingsLayout>
      {topologyError ? <Alert severity="error">{topologyError}</Alert> : null}

      <TrackSettingsSection title="BulkBed">
        <TrackSettingsFieldGrid>
          <TrackSettingsNumberField
            label="Gap"
            min={0}
            step="any"
            value={config.gap ?? 0}
            validate={(gap) => (gap >= 0 ? undefined : "Enter a non-negative number.")}
            onCommit={(gap) => applyConfig({ gap })}
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <TrackSettingsSection title="Datasets">
        <Box sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
          {datasetRows.rows.map((dataset, index) => {
            const cannotRemove = datasetRows.rows.length === 1;

            return (
              <Box
                key={dataset.key}
                aria-label={`Dataset ${index + 1}`}
                component="section"
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  display: "grid",
                  gap: 1.5,
                  minWidth: 0,
                  p: 1.5,
                }}
              >
                <Box
                  sx={{
                    alignItems: "center",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    justifyContent: "space-between",
                    minWidth: 0,
                  }}
                >
                  <Typography component="h3" variant="subtitle2">
                    Dataset {index + 1}
                  </Typography>
                  <Button
                    aria-label={`Remove dataset ${index + 1}`}
                    color="error"
                    disabled={cannotRemove}
                    size="small"
                    sx={{ textTransform: "none" }}
                    type="button"
                    variant="outlined"
                    onClick={() => removeDataset(dataset.key)}
                  >
                    Remove
                  </Button>
                </Box>

                {cannotRemove ? (
                  <Typography color="text.secondary" variant="caption">
                    At least one dataset is required.
                  </Typography>
                ) : null}

                <TrackSettingsFieldRow>
                  <TrackSettingsTextField
                    label="Name"
                    required
                    value={dataset.values.name}
                    validate={(name) => (name.trim() === "" ? "Enter a dataset name." : undefined)}
                    onCommit={(name) => commitDatasetField(dataset.key, "name", name)}
                  />
                  <TrackSettingsUrlField
                    label="URL"
                    placeholder="YOUR_URL_HERE"
                    required
                    value={dataset.values.url}
                    onCommit={(url) => commitDatasetField(dataset.key, "url", url)}
                  />
                </TrackSettingsFieldRow>
              </Box>
            );
          })}

          <Button
            size="small"
            sx={{ justifySelf: "start", textTransform: "none" }}
            type="button"
            variant="contained"
            onClick={addDataset}
          >
            Add dataset
          </Button>
        </Box>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

function createDatasetRows(datasets: BulkBedDataset[], id: string): DatasetRows {
  return {
    nextDatasetKey: datasets.length,
    rows: datasets.map((dataset, index) => makeDatasetRow(datasetKey(id, index), dataset)),
    source: datasets,
  };
}

function reconcileDatasetRows(
  currentRows: DatasetRows,
  datasets: BulkBedDataset[],
  id: string,
): DatasetRows {
  const matchedRows = matchDatasetRows(currentRows.rows, datasets);
  let nextDatasetKey = currentRows.nextDatasetKey;
  const rows = datasets.map((dataset, index) => {
    const row = matchedRows[index];
    if (row !== undefined) return { ...row, values: dataset };

    const nextRow = makeDatasetRow(datasetKey(id, nextDatasetKey), dataset);
    nextDatasetKey += 1;
    return nextRow;
  });

  return { nextDatasetKey, rows, source: datasets };
}

function matchDatasetRows(rows: DatasetRow[], datasets: BulkBedDataset[]) {
  const unusedRows = new Set(rows);

  return datasets.map((dataset, index) => {
    const exactMatch = rows.find(
      (row) => unusedRows.has(row) && datasetsAreEqual(row.values, dataset),
    );
    if (exactMatch !== undefined) {
      unusedRows.delete(exactMatch);
      return exactMatch;
    }

    const sameIndexRow = rows[index];
    if (sameIndexRow !== undefined && unusedRows.has(sameIndexRow)) {
      unusedRows.delete(sameIndexRow);
      return sameIndexRow;
    }

    const firstUnusedRow = Array.from(unusedRows)[0];
    if (firstUnusedRow !== undefined) unusedRows.delete(firstUnusedRow);
    return firstUnusedRow;
  });
}

function makeDatasetRow(key: string, values: BulkBedDataset): DatasetRow {
  return { key, values };
}

function datasetKey(id: string, sequence: number) {
  return `bulkbed-dataset-${id}-${sequence}`;
}

function datasetsAreEqual(left: BulkBedDataset, right: BulkBedDataset) {
  return left.name === right.name && left.url === right.url;
}
