"use client";

import { useState, useTransition } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import type { AnyTrackModule, TrackStoreInstance } from "@weng-lab/genomebrowser";
import type { AssemblyConfig } from "@/features/assemblies/assemblies";
import { SavedTrackList } from "./add-track/SavedTrackList";
import { TrackDraftForm } from "./add-track/TrackDraftForm";
import { TrackTypeList } from "./add-track/TrackTypeList";
import type { CustomTrack, CustomTracksResult } from "./types";

/** Create a custom track, or add one saved earlier, to the browser's track store. */
export function AddTrackDialog({
  assembly,
  useTrackStore,
  customTracks = { status: "signed-out" },
  onCreated,
  onClose,
}: {
  assembly: AssemblyConfig;
  useTrackStore: TrackStoreInstance;
  customTracks?: CustomTracksResult;
  onCreated?: (entry: CustomTrack) => void;
  onClose: () => void;
}) {
  const modules = useTrackStore((state) => state.registry.modules);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<AnyTrackModule | null>(null);
  // Owned here so the dialog cannot close while the draft form is saving.
  const [pending, startTransition] = useTransition();
  const assemblyId = assembly.definition.id;
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
                <SavedTrackList
                  result={customTracks}
                  assemblyId={assemblyId}
                  useTrackStore={useTrackStore}
                  onClose={onClose}
                />
              </Box>
            ) : (
              <Box role="tabpanel" id="new-track-panel" aria-labelledby="new-track-tab">
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Choose a track type for {assemblyId}. Configure its settings, then save it to your
                  custom collection.
                  {customTracks.status === "signed-out" && " Sign in to save custom tracks."}
                </Typography>
                <TrackTypeList modules={modules} assemblyId={assemblyId} onSelect={setSelected} />
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
