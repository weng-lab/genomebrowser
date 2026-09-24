import { Alert, Box, Chip, Stack, Typography } from "@mui/material";
import type { CustomTracksResult } from "./types";

export function CustomTrackList({ result }: { result: CustomTracksResult }) {
  if (result.status !== "ready") {
    return (
      <Alert severity={result.status === "error" ? "error" : "info"}>
        {result.status === "error"
          ? "Your custom collections could not be loaded. Please reload to try again."
          : result.status === "signed-out"
            ? "Sign in to view your custom collections."
            : "Custom track storage is unavailable."}
      </Alert>
    );
  }
  if (result.tracks.length === 0)
    return (
      <Typography color="text.secondary">
        No custom tracks yet. In the browser, choose Add track to create your first track.
      </Typography>
    );
  const assemblies = [...new Set(result.tracks.map((entry) => entry.assemblyId))];
  return (
    <Stack spacing={3}>
      {assemblies.map((assemblyId) => {
        const entries = result.tracks.filter((entry) => entry.assemblyId === assemblyId);
        return (
          <Box component="section" key={assemblyId}>
            <Typography component="h2" variant="h6">
              Custom tracks · {assemblyId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {entries.length} {entries.length === 1 ? "track" : "tracks"}
            </Typography>
            <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: "none" }}>
              {entries.map(({ track }) => (
                <Box
                  component="li"
                  key={track.base.id}
                  sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                    <Typography
                      component="h3"
                      variant="subtitle1"
                      sx={{ overflowWrap: "anywhere" }}
                    >
                      {track.base.title}
                    </Typography>
                    <Chip label={track.type} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {track.base.display} display · {track.base.height}px
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
