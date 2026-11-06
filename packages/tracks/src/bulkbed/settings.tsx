import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackRowLayoutSettings } from "../shared/settings/trackRowLayoutSettings";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsNumberField } from "../shared/settings/trackSettingsNumberField";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsTextField } from "../shared/settings/trackSettingsTextField";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { useState } from "react";
import type { BulkBedRect } from "./types";
import type { BulkBedConfig, BulkBedDataset } from "./schema";

type DatasetField = keyof BulkBedDataset;

type DatasetRow = {
  key: string;
  values: BulkBedDataset;
};

type BulkBedSettingsProps = TrackSettingsProps<BulkBedConfig, BulkBedRect>;
type DatasetEdit =
  | { type: "add" }
  | { type: "remove"; index: number }
  | { type: "field"; index: number; field: DatasetField; value: string };

type DatasetRowsState = {
  datasets: BulkBedDataset[];
  nextDatasetKey: number;
  rows: DatasetRow[];
  trackId: string;
};

type CommitDatasetEdit = (edit: DatasetEdit) => ReturnType<BulkBedSettingsProps["updateTrack"]>;

export function BulkBedSettings({ track, updateTrack, ...settings }: BulkBedSettingsProps) {
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={settings.displayOptions}
      >
        <TrackRowLayoutSettings track={track} updateTrack={updateTrack} {...settings} />
      </TrackBaseSettings>
      <GapSettings gap={track.config.gap} updateTrack={updateTrack} />
      <BulkBedDatasetsEditor
        datasets={track.config.datasets}
        disableUrls={track.source === "host"}
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
  disableUrls,
  id,
  updateTrack,
}: {
  datasets: BulkBedDataset[];
  disableUrls: boolean;
  id: string;
  updateTrack: BulkBedSettingsProps["updateTrack"];
}) {
  const [rowsState, setRowsState] = useState(() => createDatasetRowsState(datasets, id));
  const renderedRowsState = reconcileDatasetRowsState(rowsState, datasets, id);
  if (renderedRowsState !== rowsState) {
    setRowsState(renderedRowsState);
  }

  const datasetCount = datasets.length;
  const [topologyError, setTopologyError] = useState<string>();

  const commitDatasetEdit: CommitDatasetEdit = (edit) =>
    updateTrack((current) => ({
      config: { datasets: applyDatasetEdit(current.config.datasets, edit) },
    }));

  const commitTopologyEdit = (edit: DatasetEdit) => {
    const result = commitDatasetEdit(edit);
    setTopologyError(result.ok ? undefined : result.error);
  };

  const removeDataset = (index: number) => {
    if (datasetCount > 1) commitTopologyEdit({ type: "remove", index });
  };

  return (
    <>
      {topologyError ? <Alert severity="error">{topologyError}</Alert> : null}

      <TrackSettingsSection title="Datasets">
        <Box sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
          {renderedRowsState.rows.map((dataset, index) => {
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
                    onClick={() => removeDataset(index)}
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
                  datasets={datasets}
                  disableUrl={disableUrls}
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
            onClick={() => commitTopologyEdit({ type: "add" })}
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
  disableUrl,
  index,
}: {
  commitDatasetEdit: CommitDatasetEdit;
  datasets: BulkBedDataset[];
  disableUrl: boolean;
  index: number;
}) {
  return (
    <TrackSettingsFieldRow>
      <DatasetNameField commitDatasetEdit={commitDatasetEdit} datasets={datasets} index={index} />
      <DatasetUrlField
        commitDatasetEdit={commitDatasetEdit}
        datasets={datasets}
        disabled={disableUrl}
        index={index}
      />
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
  disabled,
  index,
}: {
  commitDatasetEdit: CommitDatasetEdit;
  datasets: BulkBedDataset[];
  disabled: boolean;
  index: number;
}) {
  return (
    <TrackSettingsUrlField
      label="URL"
      placeholder="YOUR_URL_HERE"
      disabled={disabled}
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

function applyDatasetEdit(datasets: BulkBedDataset[], edit: DatasetEdit): BulkBedDataset[] {
  switch (edit.type) {
    case "add":
      return [...datasets, { name: `Dataset ${datasets.length + 1}`, url: "YOUR_URL_HERE" }];
    case "remove":
      return datasets.filter((_, index) => index !== edit.index);
    case "field":
      return datasets.map((dataset, index) =>
        index === edit.index ? { ...dataset, [edit.field]: edit.value } : dataset,
      );
  }
}

function createDatasetRowsState(datasets: BulkBedDataset[], id: string): DatasetRowsState {
  return {
    datasets,
    nextDatasetKey: datasets.length,
    rows: datasets.map((dataset, index) => makeDatasetRow(datasetKey(id, index), dataset)),
    trackId: id,
  };
}

function reconcileDatasetRowsState(
  state: DatasetRowsState,
  datasets: BulkBedDataset[],
  id: string,
): DatasetRowsState {
  if (state.datasets === datasets && state.trackId === id) return state;
  if (state.trackId !== id) return createDatasetRowsState(datasets, id);

  const matchedRows = matchDatasetRows(state.rows, datasets);
  let nextDatasetKey = state.nextDatasetKey;
  const rows = datasets.map((dataset, index) => {
    const row = matchedRows[index];
    if (row !== undefined) return { ...row, values: dataset };

    const nextRow = makeDatasetRow(datasetKey(id, nextDatasetKey), dataset);
    nextDatasetKey += 1;
    return nextRow;
  });

  return {
    datasets,
    nextDatasetKey,
    rows,
    trackId: id,
  };
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
