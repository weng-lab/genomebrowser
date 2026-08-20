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
import { useRef, useState } from "react";
import type { BulkBedConfig, BulkBedDataset, BulkBedRect } from "./types";

type DatasetField = keyof BulkBedDataset;

type DatasetRow = {
  key: string;
  values: BulkBedDataset;
};

type BulkBedSettingsProps = TrackSettingsProps<BulkBedConfig, BulkBedRect>;
type DatasetEdit =
  | { type: "add"; dataset: BulkBedDataset }
  | { type: "remove"; index: number }
  | { type: "field"; index: number; field: DatasetField; value: string };

type DatasetEditorState = {
  // This version prevents stale accepted edits replaying after controlled datasets change A -> B -> A.
  baselineVersion: number;
  acceptedEdits: DatasetEdit[];
  baseDatasets: BulkBedDataset[];
  nextDatasetKey: number;
  rows: DatasetRow[];
  trackId: string;
};

type CommitDatasetEdit = (edit: DatasetEdit) => ReturnType<BulkBedSettingsProps["updateTrack"]>;

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
  const [editorState, setEditorState] = useState(() => createDatasetEditorState(datasets, id));
  const latestEditorState = useRef(editorState);
  const renderedEditorState = reconcileDatasetEditorState(editorState, datasets, id);
  if (renderedEditorState !== editorState) {
    setEditorState(renderedEditorState);
  }

  const currentDatasets = getCurrentDatasets(renderedEditorState);
  const datasetCount = currentDatasets.length;
  const [topologyError, setTopologyError] = useState<string>();

  const getCommittableEditorState = () =>
    getCommittableEditorStateForProps(latestEditorState.current, renderedEditorState);

  const commitDatasetEdit = (
    edit: DatasetEdit,
    currentEditorState = getCommittableEditorState(),
  ) => {
    const currentDatasets = getCurrentDatasets(currentEditorState);
    const nextDatasets = applyDatasetEdit(currentDatasets, edit);
    const result = updateTrack({ config: { datasets: nextDatasets } });
    if (result.ok) {
      const nextEditorState = applyAcceptedDatasetEdit(currentEditorState, edit);
      // Compose accepted edits even when React batches multiple input commits.
      latestEditorState.current = nextEditorState;
      setEditorState(nextEditorState);
    }
    return result;
  };

  const addDataset = () => {
    const currentEditorState = getCommittableEditorState();
    const currentDatasets = getCurrentDatasets(currentEditorState);
    const nextDataset: BulkBedDataset = {
      name: `Dataset ${currentDatasets.length + 1}`,
      url: "YOUR_URL_HERE",
    };
    const result = commitDatasetEdit({ type: "add", dataset: nextDataset }, currentEditorState);
    if (result.ok) {
      setTopologyError(undefined);
    } else {
      setTopologyError(result.error);
    }
  };

  const removeDataset = (key: string) => {
    const currentEditorState = getCommittableEditorState();
    const datasetIndex = currentEditorState.rows.findIndex((dataset) => dataset.key === key);
    if (datasetIndex === -1 || getCurrentDatasets(currentEditorState).length <= 1) return;

    const result = commitDatasetEdit({ type: "remove", index: datasetIndex }, currentEditorState);
    if (result.ok) {
      setTopologyError(undefined);
    } else {
      setTopologyError(result.error);
    }
  };

  return (
    <>
      {topologyError ? <Alert severity="error">{topologyError}</Alert> : null}

      <TrackSettingsSection title="Datasets">
        <Box sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
          {renderedEditorState.rows.map((dataset, index) => {
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

function getCurrentDatasets(state: DatasetEditorState) {
  return applyDatasetEdits(state.baseDatasets, state.acceptedEdits);
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

function createDatasetEditorState(datasets: BulkBedDataset[], id: string): DatasetEditorState {
  return {
    baselineVersion: 0,
    acceptedEdits: [],
    baseDatasets: datasets,
    nextDatasetKey: datasets.length,
    rows: datasets.map((dataset, index) => makeDatasetRow(datasetKey(id, index), dataset)),
    trackId: id,
  };
}

function reconcileDatasetEditorState(
  state: DatasetEditorState,
  datasets: BulkBedDataset[],
  id: string,
): DatasetEditorState {
  if (state.baseDatasets === datasets && state.trackId === id) return state;
  if (state.trackId !== id) {
    return {
      ...createDatasetEditorState(datasets, id),
      baselineVersion: state.baselineVersion + 1,
    };
  }

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
    baselineVersion: state.baselineVersion + 1,
    acceptedEdits: [],
    baseDatasets: datasets,
    nextDatasetKey,
    rows,
    trackId: id,
  };
}

function getCommittableEditorStateForProps(
  latestState: DatasetEditorState,
  renderedState: DatasetEditorState,
) {
  return latestState.baselineVersion === renderedState.baselineVersion
    ? latestState
    : renderedState;
}

function applyAcceptedDatasetEdit(
  state: DatasetEditorState,
  edit: DatasetEdit,
): DatasetEditorState {
  const acceptedEdits = [...state.acceptedEdits, edit];
  switch (edit.type) {
    case "add":
      return {
        ...state,
        acceptedEdits,
        nextDatasetKey: state.nextDatasetKey + 1,
        rows: [
          ...state.rows,
          makeDatasetRow(datasetKey(state.trackId, state.nextDatasetKey), edit.dataset),
        ],
      };
    case "remove":
      return {
        ...state,
        acceptedEdits,
        rows: state.rows.filter((_, index) => index !== edit.index),
      };
    case "field":
      return { ...state, acceptedEdits };
  }
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
