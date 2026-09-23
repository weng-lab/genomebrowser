"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import type { CustomTracksResult } from "../custom-tracks/types";
import { AddTrackDialog } from "../custom-tracks/AddTrackDialog";
import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { HighlightDialog, ControlToolbar, TrackSelect } from "@weng-lab/genomebrowser-ui";
import { useMemo, useState } from "react";
import { defaultAssembly, getAssembly } from "./assembly";
import { createBrowserStores, resolveTrackInteraction } from "./stores";
import { SessionAutosave } from "../sessions/SessionAutosave";
import type { SavedSession, SessionSnapshot } from "../sessions/types";
import { getTrackCollections } from "./trackCollections";

export function Browser({
  initialCustomTracks = { status: "signed-out" },
  initialSnapshot,
  initialSession,
}: {
  initialCustomTracks?: CustomTracksResult;
  initialSnapshot?: SessionSnapshot;
  initialSession?: Pick<SavedSession, "id" | "name" | "revision">;
}) {
  const [{ useBrowserStore, useTrackStore }] = useState(() => createBrowserStores(initialSnapshot));
  const assembly = initialSnapshot
    ? getAssembly(initialSnapshot.browser.assembly.id)!
    : defaultAssembly;
  const trackCollections = useMemo(() => getTrackCollections(assembly), [assembly]);
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [customTracks, setCustomTracks] = useState(initialCustomTracks);
  const [addTrackOpen, setAddTrackOpen] = useState(false);
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);

  return (
    <Box sx={{ p: 1 }}>
      {initialSession && (
        <SessionAutosave
          browserStore={useBrowserStore}
          trackStore={useTrackStore}
          initialSession={initialSession}
          initialSnapshot={initialSnapshot}
        />
      )}
      <Box
        sx={{
          width: "100%",
          maxWidth: 1440,
          mx: "auto",
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
              onCreated={(entry) =>
                setCustomTracks((current) => ({
                  status: "ready",
                  tracks: [
                    entry,
                    ...(current.status === "ready"
                      ? current.tracks.filter(({ track }) => track.base.id !== entry.track.base.id)
                      : []),
                  ],
                }))
              }
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
        resolveTrackInteraction={resolveTrackInteraction}
      />
      <HighlightDialog
        browserStore={useBrowserStore}
        open={highlightDialogOpen}
        onClose={() => setHighlightDialogOpen(false)}
      />
    </Box>
  );
}
