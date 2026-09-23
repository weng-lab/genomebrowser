"use client";

import Box from "@mui/material/Box";
import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { HighlightDialog, ControlToolbar, TrackSelect } from "@weng-lab/genomebrowser-ui";
import { useMemo, useState } from "react";
import { defaultAssembly, getAssembly } from "./assembly";
import { createBrowserStores, resolveTrackInteraction } from "./stores";
import { SessionAutosave } from "../sessions/SessionAutosave";
import type { SavedSession, SessionSnapshot } from "../sessions/types";
import { getTrackCollections } from "./trackCollections";

export function Browser({
  initialSnapshot,
  initialSession,
}: {
  initialSnapshot?: SessionSnapshot;
  initialSession?: Pick<SavedSession, "id" | "name" | "revision">;
}) {
  const [{ useBrowserStore, useTrackStore }] = useState(() => createBrowserStores(initialSnapshot));
  const assembly = initialSnapshot
    ? getAssembly(initialSnapshot.browser.assembly.id)!
    : defaultAssembly;
  const trackCollections = useMemo(() => getTrackCollections(assembly), [assembly]);
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
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
      <ControlToolbar
        browserStore={useBrowserStore}
        search={{
          assembly: assembly.search.assembly,
          graphqlUrl: "/api/screen-graphql",
          queries: assembly.search.queries,
        }}
        onManageHighlights={() => setHighlightDialogOpen(true)}
        onSelectTracks={() => setTrackSelectOpen(true)}
      />
      <Box sx={{ pt: 1, width: "100%", overflowX: "auto" }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
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
