"use client";

import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import CloudOff from "@mui/icons-material/CloudOff";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useSession } from "../SessionProvider";

const messages = {
  saved: "Saved",
  saving: "Saving",
  retrying: "Not saved. Retrying…",
  failed: "Not saved",
};

export function SaveStatus() {
  const status = useSession((session) => session.saveStatus);
  if (!status) return null;
  const failed = status === "retrying" || status === "failed";
  let icon = <CheckCircleOutline sx={{ fontSize: 16 }} />;
  if (status === "saving") icon = <CircularProgress size={14} color="inherit" />;
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
      <Typography variant="caption">{messages[status]}</Typography>
    </Box>
  );
}
