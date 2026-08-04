import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { BulkBedConfig, BulkBedDataset, TrackSettingsProps } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { TrackSettingsFieldGrid } from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";

type DatasetField = keyof BulkBedDataset;

type DatasetDraft = {
  key: string;
  nameDirty: boolean;
  urlDirty: boolean;
  values: BulkBedDataset;
};

type SettingsDraft = {
  datasets: DatasetDraft[];
  gap: string;
  gapDirty: boolean;
  nextDatasetKey: number;
  source: BulkBedConfig;
  topologyDirty: boolean;
  updateError?: string;
};

export function BulkBedSettings(props: TrackSettingsProps<BulkBedConfig>) {
  return <BulkBedSettingsEditor key={props.id} {...props} />;
}

function BulkBedSettingsEditor({ id, config, updateConfig }: TrackSettingsProps<BulkBedConfig>) {
  const [draft, setDraft] = useState(() => createSettingsDraft(config, id));

  if (draft.source !== config) {
    setDraft(reconcileSettingsDraft(draft, config, id));
  }

  const submitDatasets = (nextDraft: SettingsDraft) => {
    setDraft(nextDraft);

    const datasets = datasetValues(nextDraft.datasets);
    if (!hasCompleteDatasets(datasets)) return;

    const result = updateConfig({ datasets });
    if (!result.ok) setDraft({ ...nextDraft, updateError: result.error });
  };

  const updateGap = (value: string) => {
    const nextDraft = {
      ...draft,
      gap: value,
      gapDirty: true,
      updateError: undefined,
    };
    setDraft(nextDraft);

    const gap = parseGap(value);
    if (gap === undefined) return;

    const result = updateConfig({ gap });
    if (!result.ok) setDraft({ ...nextDraft, updateError: result.error });
  };

  const updateDataset = (key: string, field: DatasetField, value: string) => {
    const nextDraft = {
      ...draft,
      datasets: draft.datasets.map((dataset) => {
        if (dataset.key !== key) return dataset;

        return {
          ...dataset,
          nameDirty: field === "name" ? true : dataset.nameDirty,
          urlDirty: field === "url" ? true : dataset.urlDirty,
          values: { ...dataset.values, [field]: value },
        };
      }),
      updateError: undefined,
    };
    submitDatasets(nextDraft);
  };

  const addDataset = () => {
    const nextDraft = {
      ...draft,
      datasets: [
        ...draft.datasets,
        makeDatasetDraft(datasetKey(id, draft.nextDatasetKey), {
          name: `Dataset ${draft.datasets.length + 1}`,
          url: "YOUR_URL_HERE",
        }),
      ],
      nextDatasetKey: draft.nextDatasetKey + 1,
      topologyDirty: true,
      updateError: undefined,
    };
    submitDatasets(nextDraft);
  };

  const removeDataset = (key: string) => {
    if (draft.datasets.length <= 1) return;

    const nextDraft = {
      ...draft,
      datasets: draft.datasets.filter((dataset) => dataset.key !== key),
      topologyDirty: true,
      updateError: undefined,
    };
    submitDatasets(nextDraft);
  };

  const gapError = parseGap(draft.gap) === undefined ? "Enter a non-negative number." : undefined;
  const hasNoDatasets = draft.datasets.length === 0;
  const hasIncompleteDatasets = draft.datasets.some(
    (dataset) => !isDatasetComplete(dataset.values),
  );
  const datasetsError = hasNoDatasets
    ? "Add at least one dataset."
    : hasIncompleteDatasets
      ? "Enter a name and URL for each dataset."
      : undefined;

  return (
    <Box sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
      {draft.updateError ? <Alert severity="error">{draft.updateError}</Alert> : null}

      <TrackSettingsSection title="BulkBed">
        <TrackSettingsFieldGrid>
          <TextField
            error={Boolean(gapError)}
            fullWidth
            helperText={gapError ?? "Use a non-negative value."}
            label="Gap"
            size="small"
            slotProps={{ htmlInput: { inputMode: "decimal", min: 0, step: "any" } }}
            type="number"
            value={draft.gap}
            onChange={(event) => updateGap(event.target.value)}
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <TrackSettingsSection title="Datasets">
        <Box sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
          {datasetsError ? <Alert severity="error">{datasetsError}</Alert> : null}

          {draft.datasets.map((dataset, index) => {
            const nameError = dataset.values.name.trim() === "";
            const urlError = dataset.values.url.trim() === "";
            const cannotRemove = draft.datasets.length === 1;

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

                <TrackSettingsFieldGrid>
                  <TextField
                    error={nameError}
                    fullWidth
                    helperText={nameError ? "Enter a dataset name." : undefined}
                    label="Name"
                    required
                    size="small"
                    value={dataset.values.name}
                    onChange={(event) => updateDataset(dataset.key, "name", event.target.value)}
                  />
                  <TextField
                    autoComplete="url"
                    error={urlError}
                    fullWidth
                    helperText={urlError ? "Enter a dataset URL." : undefined}
                    label="URL"
                    placeholder="YOUR_URL_HERE"
                    required
                    size="small"
                    slotProps={{ htmlInput: { inputMode: "url" } }}
                    type="url"
                    value={dataset.values.url}
                    onChange={(event) => updateDataset(dataset.key, "url", event.target.value)}
                  />
                </TrackSettingsFieldGrid>
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
    </Box>
  );
}

function createSettingsDraft(config: BulkBedConfig, id: string): SettingsDraft {
  return {
    datasets: config.datasets.map((dataset, index) =>
      makeDatasetDraft(datasetKey(id, index), dataset),
    ),
    gap: gapInputValue(config.gap),
    gapDirty: false,
    nextDatasetKey: config.datasets.length,
    source: config,
    topologyDirty: false,
  };
}

function reconcileSettingsDraft(
  draft: SettingsDraft,
  config: BulkBedConfig,
  id: string,
): SettingsDraft {
  const draftDatasets = datasetValues(draft.datasets);
  const datasetsAcknowledged = datasetsAreEqual(draftDatasets, config.datasets);
  const reconciledDatasetState =
    datasetsAcknowledged || draft.topologyDirty
      ? { datasets: draft.datasets, nextDatasetKey: draft.nextDatasetKey }
      : reconcileDatasetDrafts(draft.datasets, config.datasets, id, draft.nextDatasetKey);

  return {
    ...draft,
    datasets: datasetsAcknowledged
      ? draft.datasets.map(clearDatasetDraft)
      : reconciledDatasetState.datasets,
    gap: reconcileGap(draft.gap, draft.gapDirty, config.gap),
    gapDirty: gapIsAcknowledged(draft.gap, draft.gapDirty, config.gap) ? false : draft.gapDirty,
    nextDatasetKey: reconciledDatasetState.nextDatasetKey,
    source: config,
    topologyDirty: datasetsAcknowledged ? false : draft.topologyDirty,
  };
}

function reconcileDatasetDrafts(
  drafts: DatasetDraft[],
  datasets: BulkBedDataset[],
  id: string,
  nextDatasetKey: number,
) {
  const matchedDrafts = matchDatasetDrafts(drafts, datasets);
  let nextKey = nextDatasetKey;

  return {
    datasets: datasets.map((dataset, index) => {
      const draft = matchedDrafts[index];
      if (draft) return reconcileDatasetDraft(draft, dataset);

      const nextDraft = makeDatasetDraft(datasetKey(id, nextKey), dataset);
      nextKey += 1;
      return nextDraft;
    }),
    nextDatasetKey: nextKey,
  };
}

function matchDatasetDrafts(drafts: DatasetDraft[], datasets: BulkBedDataset[]) {
  const unusedDrafts = new Set(drafts);

  return datasets.map((dataset, index) => {
    const exactMatch = drafts.find(
      (draft) => unusedDrafts.has(draft) && datasetIsEqual(draft.values, dataset),
    );
    if (exactMatch) {
      unusedDrafts.delete(exactMatch);
      return exactMatch;
    }

    const sameIndexDraft = drafts[index];
    if (sameIndexDraft && unusedDrafts.has(sameIndexDraft)) {
      unusedDrafts.delete(sameIndexDraft);
      return sameIndexDraft;
    }

    const firstUnusedDraft = Array.from(unusedDrafts)[0];
    if (firstUnusedDraft) unusedDrafts.delete(firstUnusedDraft);
    return firstUnusedDraft;
  });
}

function reconcileDatasetDraft(draft: DatasetDraft, dataset: BulkBedDataset): DatasetDraft {
  const nameAcknowledged = draft.nameDirty && draft.values.name === dataset.name;
  const urlAcknowledged = draft.urlDirty && draft.values.url === dataset.url;

  return {
    ...draft,
    nameDirty: nameAcknowledged ? false : draft.nameDirty,
    urlDirty: urlAcknowledged ? false : draft.urlDirty,
    values: {
      name: draft.nameDirty && !nameAcknowledged ? draft.values.name : dataset.name,
      url: draft.urlDirty && !urlAcknowledged ? draft.values.url : dataset.url,
    },
  };
}

function clearDatasetDraft(draft: DatasetDraft): DatasetDraft {
  return { ...draft, nameDirty: false, urlDirty: false };
}

function makeDatasetDraft(key: string, values: BulkBedDataset): DatasetDraft {
  return { key, nameDirty: false, urlDirty: false, values };
}

function datasetKey(id: string, sequence: number) {
  return `bulkbed-dataset-${id}-${sequence}`;
}

function datasetValues(datasets: DatasetDraft[]): BulkBedDataset[] {
  return datasets.map((dataset) => dataset.values);
}

function datasetsAreEqual(left: BulkBedDataset[], right: BulkBedDataset[]) {
  return (
    left.length === right.length &&
    left.every((dataset, index) => datasetIsEqual(dataset, right[index]))
  );
}

function datasetIsEqual(left: BulkBedDataset, right: BulkBedDataset | undefined) {
  return left.name === right?.name && left.url === right?.url;
}

function hasCompleteDatasets(datasets: BulkBedDataset[]) {
  return datasets.length > 0 && datasets.every(isDatasetComplete);
}

function isDatasetComplete(dataset: BulkBedDataset) {
  return dataset.name.trim() !== "" && dataset.url.trim() !== "";
}

function reconcileGap(value: string, dirty: boolean, configuredGap: number | undefined) {
  return gapIsAcknowledged(value, dirty, configuredGap) || !dirty
    ? gapInputValue(configuredGap)
    : value;
}

function gapIsAcknowledged(value: string, dirty: boolean, configuredGap: number | undefined) {
  return dirty && parseGap(value) === (configuredGap ?? 0);
}

function gapInputValue(gap: number | undefined) {
  return String(gap ?? 0);
}

function parseGap(value: string) {
  if (value.trim() === "") return undefined;

  const gap = Number(value);
  return Number.isFinite(gap) && gap >= 0 ? gap : undefined;
}
