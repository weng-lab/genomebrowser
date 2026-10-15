"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ActiveTracks, type TrackSelectTrackIdResolver } from "@weng-lab/genomebrowser-ui";
import { useBrowserSession } from "../../../browser/BrowserSession";
import { useSessionLoading, useSessionSaveState } from "../../../browser/BrowserServer";
import { getTrackCollections } from "../collections/catalog";
import { resolveDefaultCollectionTrackId } from "../collections/trackIdentity";

const collections = getTrackCollections();
const resolveCollectionTrackId: TrackSelectTrackIdResolver = (track) =>
  resolveDefaultCollectionTrackId(track, collections);

export default function BrowserActiveTracks() {
  const loading = useSessionLoading();
  return loading ? <LoadingTracks /> : <LoadedTracks />;
}

function LoadingTracks() {
  const status = useSessionSaveState();
  return (
    <Typography role="status" sx={{ p: 2 }} variant="body2">
      {status === "load-error" ? "Could not load session. Retrying..." : "Loading active tracks..."}
    </Typography>
  );
}

function LoadedTracks() {
  const { useTrackStore } = useBrowserSession();
  const tracks = useTrackStore((state) => state.tracks);
  const visibleTracks = useMemo(() => tracks.filter((track) => track.type !== "ruler"), [tracks]);
  const [error, setError] = useState<string>();
  function removeTracks(ids: string[]) {
    const removed = new Set(ids);
    const state = useTrackStore.getState();
    const result = state.setTracks(state.tracks.filter((track) => !removed.has(track.base.id)));
    setError(result.ok ? undefined : result.error);
  }
  return (
    <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      {error && (
        <Typography role="alert" color="error" sx={{ p: 1 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ActiveTracks
          tracks={visibleTracks}
          trackCollections={collections}
          resolveCollectionTrackId={resolveCollectionTrackId}
          onRemoveTrackIds={removeTracks}
        />
      </Box>
    </Box>
  );
}
