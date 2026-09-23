"use client";

import { useRef, useState, useTransition, type TransitionStartFunction } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  createTrackStore,
  type AnyTrackModule,
  type TrackSettingsComponent,
  type TrackStoreInstance,
} from "@weng-lab/genomebrowser";
import type { AssemblyConfig } from "../browser/assembly";
import { saveCustomTrack } from "./actions";
import { createCustomTrackDraft, trackCatalog } from "./catalog";
import { TrackPreview } from "./TrackPreview";
import { CustomTrackPicker } from "./CustomTrackPicker";
import type { CustomTrack, CustomTracksResult } from "./types";
import { validateSourceUrls } from "./sourceUrls";

export function AddTrackDialog({
  assembly,
  useTrackStore,
  customTracks = { status: "signed-out" },
  onCreated,
  onClose,
}: {
  customTracks?: CustomTracksResult;
  onCreated?: (entry: CustomTrack) => void;
  assembly: AssemblyConfig;
  useTrackStore: TrackStoreInstance;
  onClose: () => void;
}) {
  const modules = useTrackStore((state) => state.registry.modules);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<AnyTrackModule | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      open
      onClose={pending ? undefined : onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="add-track-title"
    >
      {selected ? (
        <TrackDraftForm
          key={selected.type}
          module={selected}
          assembly={assembly}
          useTrackStore={useTrackStore}
          onBack={() => setSelected(null)}
          onCreated={onCreated}
          onClose={onClose}
          pending={pending}
          startTransition={startTransition}
        />
      ) : (
        <>
          <DialogTitle id="add-track-title">Add a new track</DialogTitle>
          <Tabs
            value={tab}
            onChange={(_, value: number) => setTab(value)}
            aria-label="Track source"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 3 }}
          >
            <Tab label="New track" id="new-track-tab" aria-controls="new-track-panel" />
            <Tab
              label="Saved custom tracks"
              id="saved-tracks-tab"
              aria-controls="saved-tracks-panel"
            />
          </Tabs>
          <DialogContent dividers sx={{ maxHeight: "70vh" }}>
            {tab === 1 ? (
              <Box role="tabpanel" id="saved-tracks-panel" aria-labelledby="saved-tracks-tab">
                <CustomTrackPicker
                  result={customTracks}
                  assemblyId={assembly.definition.id}
                  useTrackStore={useTrackStore}
                  onClose={onClose}
                />
              </Box>
            ) : (
              <Box role="tabpanel" id="new-track-panel" aria-labelledby="new-track-tab">
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Choose a track type for {assembly.definition.id}. Configure its settings, then
                  save it to your custom collection.
                  {customTracks.status === "signed-out" && " Sign in to save custom tracks."}
                </Typography>
                <Stack component="ul" spacing={1.5} sx={{ p: 0, m: 0, listStyle: "none" }}>
                  {modules.map((module) => {
                    const entry = trackCatalog[module.type];
                    if (!entry || !module.settingsComponent) return null;
                    const unavailable = Boolean(
                      entry.assembly && entry.assembly !== assembly.definition.id,
                    );
                    return (
                      <Card component="li" key={module.type} variant="outlined">
                        <CardActionArea
                          disabled={unavailable}
                          onClick={() => setSelected(module)}
                          aria-label={`Add ${entry.label}`}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            textAlign: "left",
                            opacity: unavailable ? 0.5 : 1,
                          }}
                        >
                          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                            <Typography component="h3" variant="subtitle1" fontWeight={600}>
                              {entry.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {entry.description}
                            </Typography>
                          </Box>
                          <TrackPreview type={module.type} />
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function TrackDraftForm({
  module,
  assembly,
  useTrackStore,
  onBack,
  onCreated,
  onClose,
  pending,
  startTransition,
}: {
  pending: boolean;
  startTransition: TransitionStartFunction;
  module: AnyTrackModule;
  assembly: AssemblyConfig;
  useTrackStore: TrackStoreInstance;
  onCreated?: (entry: CustomTrack) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [useDraftStore] = useState(() =>
    createTrackStore({ modules: [module], tracks: [createCustomTrackDraft(module, assembly)] }),
  );
  const track = useDraftStore((state) => state.tracks[0]);
  const updateTrack = useDraftStore((state) => state.updateTrack);
  const [error, setError] = useState<string>();
  const saving = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const Settings = module.settingsComponent as TrackSettingsComponent<Record<string, unknown>>;

  function submit() {
    if (saving.current) return;
    if (!form.current?.reportValidity() || form.current.querySelector('[aria-invalid="true"]')) {
      setError("Check the highlighted settings before adding the track.");
      return;
    }
    const draft = useDraftStore.getState().tracks[0];
    try {
      const urls = validateSourceUrls(draft.config);
      // URL fields deliberately use Set. Do not silently save an older committed source.
      const visibleUrls = [...form.current.querySelectorAll<HTMLInputElement>('input[type="url"]')]
        .map((input) => input.value)
        .filter(Boolean);
      if (JSON.stringify(visibleUrls.sort()) !== JSON.stringify(urls.sort()))
        throw new Error("Click Set beside each source URL before adding the track.");
      if (draft.type === "methylc" && urls.length === 0)
        throw new Error("Enter at least one methylation source URL.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check the source URLs.");
      return;
    }
    setError(undefined);
    saving.current = true;
    startTransition(async () => {
      try {
        const result = await saveCustomTrack({
          assemblyId: assembly.definition.id,
          track: JSON.parse(JSON.stringify(draft)),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onCreated?.(result.entry);
        const state = useTrackStore.getState();
        const added = state.addTrack(result.entry.track, 0);
        if (!added.ok) {
          setError(
            `Your track was saved to the dashboard, but could not be added to the browser: ${added.error}`,
          );
          return;
        }
        onClose();
      } catch {
        setError("Your track could not be saved. Please try again.");
      } finally {
        saving.current = false;
      }
    });
  }

  return (
    <>
      <DialogTitle id="add-track-title">Configure {trackCatalog[module.type].label}</DialogTitle>
      {error && (
        <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
          {error}
        </Alert>
      )}
      <DialogContent dividers sx={{ maxHeight: "70vh" }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Save to Custom tracks · {assembly.definition.id}. Use Set to confirm source URLs. Changes
          stay in this draft until you add the track.
        </Typography>
        <Box
          component="form"
          ref={form}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Box component="fieldset" disabled={pending} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
            <Settings
              track={{ ...track, interaction: undefined }}
              displayOptions={module.displays}
              updateTrack={(update) => updateTrack(track.base.id, update)}
              updateTracksOfType={(createUpdate) =>
                updateTrack(
                  track.base.id,
                  createUpdate({ ...useDraftStore.getState().tracks[0], interaction: undefined }),
                )
              }
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={onBack}>
          Back
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={pending} variant="contained" onClick={submit}>
          {pending ? "Adding…" : "Add track"}
        </Button>
      </DialogActions>
    </>
  );
}
