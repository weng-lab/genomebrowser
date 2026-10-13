"use client";

import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import CloudOff from "@mui/icons-material/CloudOff";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useSessionSaveState } from "../../../browser/BrowserServer";

const messages = {
  loading: "Loading session",
  "load-error": "Could not load session. Retrying…",
  saving: "Saving",
  saved: "Saved",
  error: "Not saved. Retrying…",
};

export function SaveStatus() {
  const state = useSessionSaveState();
  if (state === "disabled") return null;
  const failed = state === "error" || state === "load-error";
  const busy = state === "loading" || state === "saving";
  let icon = <CheckCircleOutline sx={{ fontSize: 16 }} />;
  if (busy) icon = <CircularProgress size={14} color="inherit" />;
  if (failed) icon = <CloudOff sx={{ fontSize: 16 }} />;
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        color: failed ? "error.main" : "text.secondary",
        mb: 1,
      }}
    >
      {icon}
      <Typography variant="caption">{messages[state]}</Typography>
    </Box>
  );
}
