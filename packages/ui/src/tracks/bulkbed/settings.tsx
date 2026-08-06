import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
  useSettingsStore,
  useTrackStore,
  useTrackStoreApi,
  type BulkBedConfig,
  type BulkBedDataset,
} from "@weng-lab/genomebrowser";
import { useEffect, useState } from "react";
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

export function BulkBedSettings() {
  return (
    <TrackSettingsLayout>
      <GapSettings />
      <BulkBedDatasetsEditor />
    </TrackSettingsLayout>
  );
}

function GapSettings() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const gap = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BulkBedConfig | undefined)?.gap,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <TrackSettingsSection title="BulkBed">
      <TrackSettingsFieldGrid>
        <TrackSettingsNumberField
          label="Gap"
          min={0}
          step="any"
          value={gap ?? 0}
          validate={(value) => (value >= 0 ? undefined : "Enter a non-negative number.")}
          onCommit={(value) => updateTrack(trackId, { config: { gap: value } })}
        />
      </TrackSettingsFieldGrid>
    </TrackSettingsSection>
  );
}

function BulkBedDatasetsEditor() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const datasetCount = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BulkBedConfig | undefined)?.datasets.length ?? 0,
  );
  const trackStore = useTrackStoreApi();
  const datasets = (trackStore.getState().getTrack(trackId)!.config as BulkBedConfig).datasets;
  const [datasetRows, setDatasetRows] = useState(() => createDatasetRows(datasets, trackId));
  const [topologyError, setTopologyError] = useState<string>();

  useEffect(() => {
    setDatasetRows((currentRows) =>
      currentRows.source === datasets
        ? currentRows
        : reconcileDatasetRows(currentRows, datasets, trackId),
    );
  }, [datasets, trackId]);

  const addDataset = () => {
    const nextDataset: BulkBedDataset = {
      name: `Dataset ${datasetRows.rows.length + 1}`,
      url: "YOUR_URL_HERE",
    };
    const state = trackStore.getState();
    const currentDatasets = (state.getTrack(trackId)!.config as BulkBedConfig).datasets;
    const result = state.updateTrack(trackId, {
      config: { datasets: [...currentDatasets, nextDataset] },
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
        makeDatasetRow(datasetKey(trackId, currentRows.nextDatasetKey), nextDataset),
      ],
    }));
  };

  const removeDataset = (key: string) => {
    const datasetIndex = datasetRows.rows.findIndex((dataset) => dataset.key === key);
    const state = trackStore.getState();
    const currentDatasets = (state.getTrack(trackId)!.config as BulkBedConfig).datasets;
    if (datasetIndex === -1 || currentDatasets.length <= 1) return;

    const result = state.updateTrack(trackId, {
      config: { datasets: currentDatasets.filter((_, index) => index !== datasetIndex) },
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

                <DatasetFields index={index} />
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

function DatasetFields({ index }: { index: number }) {
  return (
    <TrackSettingsFieldRow>
      <DatasetNameField index={index} />
      <DatasetUrlField index={index} />
    </TrackSettingsFieldRow>
  );
}

function DatasetNameField({ index }: { index: number }) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const name = useTrackStore(
    (state) =>
      (state.getTrack(trackId)?.config as BulkBedConfig | undefined)?.datasets[index]?.name ?? "",
  );
  const trackStore = useTrackStoreApi();

  return (
    <TrackSettingsTextField
      label="Name"
      required
      value={name}
      validate={(value) => (value.trim() === "" ? "Enter a dataset name." : undefined)}
      onCommit={(value) => updateDatasetField(trackStore, trackId, index, "name", value)}
    />
  );
}

function DatasetUrlField({ index }: { index: number }) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const url = useTrackStore(
    (state) =>
      (state.getTrack(trackId)?.config as BulkBedConfig | undefined)?.datasets[index]?.url ?? "",
  );
  const trackStore = useTrackStoreApi();

  return (
    <TrackSettingsUrlField
      label="URL"
      placeholder="YOUR_URL_HERE"
      required
      value={url}
      onCommit={(value) => updateDatasetField(trackStore, trackId, index, "url", value)}
    />
  );
}

function updateDatasetField(
  trackStore: ReturnType<typeof useTrackStoreApi>,
  trackId: string,
  index: number,
  field: DatasetField,
  value: string,
) {
  const state = trackStore.getState();
  const datasets = (state.getTrack(trackId)!.config as BulkBedConfig).datasets;
  return state.updateTrack(trackId, {
    config: {
      datasets: datasets.map((dataset, datasetIndex) =>
        datasetIndex === index ? { ...dataset, [field]: value } : dataset,
      ),
    },
  });
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
