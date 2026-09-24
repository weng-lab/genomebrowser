"use client";

import { useRef, useState, type TransitionStartFunction } from "react";
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import {
  createTrackStore,
  type AnyTrackModule,
  type TrackSettingsComponent,
  type TrackStoreInstance,
} from "@weng-lab/genomebrowser";
import type { AssemblyConfig } from "@/features/assemblies/assemblies";
import { saveCustomTrack } from "../actions";
import { assertCatalogRules, createCustomTrackDraft, getCatalogEntry } from "../catalog";
import type { CustomTrack } from "../types";

// Track settings components have no validity API, so these checks read the rendered form.

function assertFormValid(form: HTMLFormElement) {
  if (!form.reportValidity() || form.querySelector('[aria-invalid="true"]')) {
    throw new Error("Check the highlighted settings before adding the track.");
  }
}

/** Reject source URLs typed into the form without clicking Set. */
function assertUrlsCommitted(form: HTMLFormElement, committedUrls: string[]) {
  const visibleUrls = [...form.querySelectorAll<HTMLInputElement>('input[type="url"]')]
    .map((input) => input.value)
    .filter(Boolean);
  if (JSON.stringify(visibleUrls.sort()) !== JSON.stringify([...committedUrls].sort())) {
    throw new Error("Click Set beside each source URL before adding the track.");
  }
}

/** Configure a new track in an isolated draft store, then save it and add it to the browser. */
export function TrackDraftForm({
  module,
  assembly,
  useTrackStore,
  onBack,
  onCreated,
  onClose,
  pending,
  startTransition,
}: {
  module: AnyTrackModule;
  assembly: AssemblyConfig;
  useTrackStore: TrackStoreInstance;
  onBack: () => void;
  onCreated?: (entry: CustomTrack) => void;
  onClose: () => void;
  pending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const [useDraftStore] = useState(() =>
    createTrackStore({ modules: [module], tracks: [createCustomTrackDraft(module, assembly)] }),
  );
  const track = useDraftStore((state) => state.tracks[0]);
  const updateTrack = useDraftStore((state) => state.updateTrack);
  const [error, setError] = useState<string>();
  // Guards a second submission before the pending state re-renders the buttons.
  const saving = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const Settings = module.settingsComponent as TrackSettingsComponent<Record<string, unknown>>;
  const label = getCatalogEntry(module.type)?.label ?? module.type;

  function submit() {
    if (saving.current || !form.current) return;
    const draft = useDraftStore.getState().tracks[0];
    try {
      assertFormValid(form.current);
      assertUrlsCommitted(form.current, assertCatalogRules(draft, assembly.definition.id));
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
        const added = useTrackStore.getState().addTrack(result.entry.track, 0);
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
      <DialogTitle id="add-track-title">Configure {label}</DialogTitle>
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
