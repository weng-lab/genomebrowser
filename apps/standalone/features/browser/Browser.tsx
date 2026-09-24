"use client";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { ControlToolbar, HighlightDialog, TrackSelect } from "@weng-lab/genomebrowser-ui";
import { useMemo, useState } from "react";
import { defaultAssembly, getAssembly } from "@/features/assemblies/assemblies";
import { getTrackCollections } from "@/features/assemblies/trackCollections";
import { AddTrackDialog } from "@/features/custom-tracks/AddTrackDialog";
import type { CustomTrack, CustomTracksResult } from "@/features/custom-tracks/types";
import { restoreStores } from "@/features/session-snapshot/restoreStores";
import { SessionAutosave } from "@/features/sessions/SessionAutosave";
import type { SavedSession } from "@/features/sessions/types";

function withCreatedTrack(current: CustomTracksResult, entry: CustomTrack): CustomTracksResult {
  const others =
    current.status === "ready"
      ? current.tracks.filter(({ track }) => track.base.id !== entry.track.base.id)
      : [];
  return { status: "ready", tracks: [entry, ...others] };
}

/**
 * The genomic workspace. With a saved session, it restores and autosaves that session;
 * without one, it starts from the guest defaults and saves nothing.
 */
export function Browser({
  customTracks: initialCustomTracks = { status: "signed-out" },
  session,
}: {
  customTracks?: CustomTracksResult;
  session?: Pick<SavedSession, "id" | "name" | "revision" | "snapshot">;
}) {
  const [{ useBrowserStore, useTrackStore }] = useState(() => restoreStores(session?.snapshot));
  // Saved snapshots are validated against the registry when loaded.
  const assembly =
    (session && getAssembly(session.snapshot.browser.assembly.id)) || defaultAssembly;
  const trackCollections = useMemo(() => getTrackCollections(assembly), [assembly]);
  const [customTracks, setCustomTracks] = useState(initialCustomTracks);
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [addTrackOpen, setAddTrackOpen] = useState(false);
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);

  return (
    <Box sx={{ p: 1 }}>
      {session && (
        <SessionAutosave
          browserStore={useBrowserStore}
          trackStore={useTrackStore}
          session={session}
        />
      )}
      <Box
        sx={{
          width: "100%",
          maxWidth: 1440,
          mx: "auto",
          // ControlToolbar has no styling props; its root is labeled for this selector.
          '& > [aria-label="Genome browser controls"]': {
            justifyContent: "space-evenly",
          },
        }}
      >
        <ControlToolbar
          browserStore={useBrowserStore}
          search={{
            assembly: assembly.search.assembly,
            graphqlUrl: "/api/screen-graphql",
            queries: assembly.search.queries,
          }}
          onManageHighlights={() => setHighlightDialogOpen(true)}
          onSelectTracks={() => setTrackSelectOpen(true)}
          managementActions={
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAddTrackOpen(true)}>
              Add track
            </Button>
          }
        />
      </Box>
      <Box sx={{ pt: 1, width: "100%", overflowX: "auto" }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore}>
          {addTrackOpen && (
            <AddTrackDialog
              assembly={assembly}
              useTrackStore={useTrackStore}
              customTracks={customTracks}
              onCreated={(entry) => setCustomTracks((current) => withCreatedTrack(current, entry))}
              onClose={() => setAddTrackOpen(false)}
            />
          )}
        </GenomeBrowser>
      </Box>
      <TrackSelect
        open={trackSelectOpen}
        onClose={() => setTrackSelectOpen(false)}
        title="Choose tracks"
        trackCollections={trackCollections}
        useTrackStore={useTrackStore}
      />
      <HighlightDialog
        browserStore={useBrowserStore}
        open={highlightDialogOpen}
        onClose={() => setHighlightDialogOpen(false)}
      />
    </Box>
  );
}
