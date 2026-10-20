"use client";

import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import CloudOff from "@mui/icons-material/CloudOff";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useSession } from "../SessionProvider";

const messages = {
  saved: "Saved",
  saving: "Saving…",
  retrying: "Not saved yet. Retrying…",
  conflict: "Not saved. Changed elsewhere",
  failed: "Not saved",
};

/** Whether the open session's edits are saved. Nothing while no session is open. */
export function SaveStatus() {
  const status = useSession((session) => session.saveStatus);
  if (!status) return null;
  const failed = status === "conflict" || status === "failed";
  let icon = <CheckCircleOutline sx={{ fontSize: 16 }} />;
  if (status === "saving" || status === "retrying")
    icon = <CircularProgress size={14} color="inherit" />;
  if (failed) icon = <CloudOff sx={{ fontSize: 16 }} />;
  return (
    <Box
      component="output"
      aria-live="polite"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        mb: 1,
        color: failed || status === "retrying" ? "error.main" : "text.secondary",
      }}
    >
      {icon}
      <Typography variant="caption">{messages[status]}</Typography>
    </Box>
  );
}
