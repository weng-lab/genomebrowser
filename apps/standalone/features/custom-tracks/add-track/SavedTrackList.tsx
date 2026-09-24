import { useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import type { TrackStoreInstance } from "@weng-lab/genomebrowser";
import type { CustomTracksResult } from "../types";

export function SavedTrackList({
  result,
  assemblyId,
  useTrackStore,
  onClose,
}: {
  result: CustomTracksResult;
  assemblyId: string;
  useTrackStore: TrackStoreInstance;
  onClose: () => void;
}) {
  const tracks = useTrackStore((state) => state.tracks);
  const addTrack = useTrackStore((state) => state.addTrack);
  const [error, setError] = useState<string>();
  if (result.status !== "ready")
    return (
      <Alert severity={result.status === "error" ? "error" : "info"}>
        {result.status === "signed-out"
          ? "Sign in to save and reuse custom tracks."
          : "Custom tracks are unavailable. Reload the page to try again."}
      </Alert>
    );
  const available = result.tracks.filter((entry) => entry.assemblyId === assemblyId);
  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Custom tracks · {assemblyId}. Each session keeps its own copy of the track settings.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {available.length === 0 && (
        <Typography>
          No custom tracks for this assembly yet. Choose New track to create one.
        </Typography>
      )}
      {available.map(({ track }) => {
        const added = tracks.some(({ base }) => base.id === track.base.id);
        return (
          <Stack
            key={track.base.id}
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}
          >
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ overflowWrap: "anywhere" }}>{track.base.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {track.type}
              </Typography>
            </Stack>
            <Button
              disabled={added}
              onClick={() => {
                const result = addTrack(track, 0);
                if (result.ok) onClose();
                else setError(result.error);
              }}
            >
              {added ? "Added" : "Add to browser"}
            </Button>
          </Stack>
        );
      })}
    </Stack>
  );
}
