import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type {
  BulkBedConfig,
  BulkBedDataset,
  BulkBedRect,
  TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
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

type BulkBedSettingsProps = TrackSettingsProps<BulkBedConfig, BulkBedRect>;
type DatasetEdit =
  | { type: "add"; dataset: BulkBedDataset }
  | { type: "remove"; index: number }
  | { type: "field"; index: number; field: DatasetField; value: string };

type PendingDatasetEdits = {
  source: BulkBedDataset[];
  edits: DatasetEdit[];
};

type CommitDatasetEdit = (
  edit: DatasetEdit,
  onAccepted?: () => void,
) => ReturnType<BulkBedSettingsProps["updateTrack"]>;

export function BulkBedSettings({ track, updateTrack }: BulkBedSettingsProps) {
  return (
    <TrackSettingsLayout>
      <GapSettings gap={track.config.gap} updateTrack={updateTrack} />
      <BulkBedDatasetsEditor
        datasets={track.config.datasets}
        id={track.base.id}
        updateTrack={updateTrack}
      />
    </TrackSettingsLayout>
  );
}

function GapSettings({
  gap,
  updateTrack,
}: {
  gap: number | undefined;
  updateTrack: BulkBedSettingsProps["updateTrack"];
}) {
  return (
    <TrackSettingsSection title="BulkBed">
      <TrackSettingsFieldGrid>
        <TrackSettingsNumberField
          label="Gap"
          min={0}
          step="any"
          value={gap ?? 0}
          validate={(value) => (value >= 0 ? undefined : "Enter a non-negative number.")}
          onCommit={(value) => updateTrack({ config: { gap: value } })}
        />
      </TrackSettingsFieldGrid>
    </TrackSettingsSection>
  );
}

function BulkBedDatasetsEditor({
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
  const [datasetRows, setDatasetRows] = useState(() => createDatasetRows(datasets, id));
  const [topologyError, setTopologyError] = useState<string>();

  useEffect(() => {
    setDatasetRows((currentRows) =>
      currentRows.source === datasets
        ? currentRows
        : reconcileDatasetRows(currentRows, datasets, id),
    );
  }, [datasets, id]);

  const commitDatasetEdit: CommitDatasetEdit = (edit, onAccepted) => {
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

  const addDataset = () => {
    const nextDataset: BulkBedDataset = {
      name: `Dataset ${currentDatasets.length + 1}`,
      url: "YOUR_URL_HERE",
    };
    const result = commitDatasetEdit({ type: "add", dataset: nextDataset }, () => {
      setTopologyError(undefined);
      setDatasetRows((currentRows) => ({
        ...currentRows,
        nextDatasetKey: currentRows.nextDatasetKey + 1,
        rows: [
          ...currentRows.rows,
          makeDatasetRow(datasetKey(id, currentRows.nextDatasetKey), nextDataset),
        ],
      }));
    });
    if (!result.ok) {
      setTopologyError(result.error);
    }
  };

  const removeDataset = (key: string) => {
    const datasetIndex = datasetRows.rows.findIndex((dataset) => dataset.key === key);
    if (datasetIndex === -1 || currentDatasets.length <= 1) return;

    const result = commitDatasetEdit({ type: "remove", index: datasetIndex }, () => {
      setTopologyError(undefined);
      setDatasetRows((currentRows) => ({
        ...currentRows,
        rows: currentRows.rows.filter((dataset) => dataset.key !== key),
      }));
    });
    if (!result.ok) {
      setTopologyError(result.error);
    }
  };

  return (
    <>
      {topologyError ? <Alert severity="error">{topologyError}</Alert> : null}

      <TrackSettingsSection title="Datasets">
        <Box sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
          {datasetRows.rows.map((dataset, index) => {
            const cannotRemove = datasetCount === 1;

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

                <DatasetFields
                  commitDatasetEdit={commitDatasetEdit}
                  datasets={currentDatasets}
                  index={index}
                />
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
    </>
  );
}

function DatasetFields({
  commitDatasetEdit,
  datasets,
  index,
}: {
  commitDatasetEdit: CommitDatasetEdit;
  datasets: BulkBedDataset[];
  index: number;
}) {
  return (
    <TrackSettingsFieldRow>
      <DatasetNameField commitDatasetEdit={commitDatasetEdit} datasets={datasets} index={index} />
      <DatasetUrlField commitDatasetEdit={commitDatasetEdit} datasets={datasets} index={index} />
    </TrackSettingsFieldRow>
  );
}

function DatasetNameField({
  commitDatasetEdit,
  datasets,
  index,
}: {
  commitDatasetEdit: CommitDatasetEdit;
  datasets: BulkBedDataset[];
  index: number;
}) {
  return (
    <TrackSettingsTextField
      label="Name"
      required
      value={datasets[index]?.name ?? ""}
      validate={(value) => (value.trim() === "" ? "Enter a dataset name." : undefined)}
      onCommit={(value) => updateDatasetField(commitDatasetEdit, index, "name", value)}
    />
  );
}

function DatasetUrlField({
  commitDatasetEdit,
  datasets,
  index,
}: {
  commitDatasetEdit: CommitDatasetEdit;
  datasets: BulkBedDataset[];
  index: number;
}) {
  return (
    <TrackSettingsUrlField
      label="URL"
      placeholder="YOUR_URL_HERE"
      required
      value={datasets[index]?.url ?? ""}
      onCommit={(value) => updateDatasetField(commitDatasetEdit, index, "url", value)}
    />
  );
}

function updateDatasetField(
  commitDatasetEdit: CommitDatasetEdit,
  index: number,
  field: DatasetField,
  value: string,
) {
  return commitDatasetEdit({ type: "field", index, field, value });
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
