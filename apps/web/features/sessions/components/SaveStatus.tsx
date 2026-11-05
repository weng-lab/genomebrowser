"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha, type Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { narrowTitleRow, visuallyHidden } from "../../../shared/workspace/frame/layout";
import type { SaveStatus as Status } from "../autosave";
import { useSession } from "../SessionProvider";

/**
 * How each status looks: a short label, a tint, and a dot, or a spinner while a write is
 * in flight. The alert above the browser explains failures in full.
 */
const looks = {
  saved: { label: "All changes saved", color: "success", busy: false },
  saving: { label: "Saving…", color: undefined, busy: true },
  retrying: { label: "Retrying…", color: "warning", busy: true },
  conflict: { label: "Changed elsewhere", color: "error", busy: false },
  failed: { label: "Not saved", color: "error", busy: false },
} satisfies Record<
  Status,
  { label: string; color?: "success" | "warning" | "error"; busy: boolean }
>;

/** A pill showing whether the open session's edits are saved. Nothing while no session is open. */
export function SaveStatus() {
  const status = useSession((session) => session.saveStatus);
  if (!status) return null;
  const { label, color, busy } = looks[status];
  return (
    <Box
      component="output"
      aria-live="polite"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        height: 28,
        px: 1.25,
        borderRadius: 999,
        flexShrink: 0,
        // Gray while saving; otherwise a light tint of the status color, with darker text.
        color: color ? `${color}.dark` : "text.secondary",
        bgcolor: color ? (theme: Theme) => alpha(theme.palette[color].main, 0.12) : "action.hover",
        // Just the dot or spinner, so the session name keeps its room.
        [narrowTitleRow]: { px: 1 },
      }}
    >
      {busy ? (
        <CircularProgress size={10} thickness={6} color="inherit" />
      ) : (
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: `${color}.main` }} />
      )}
      <Typography
        variant="caption"
        noWrap
        sx={{ fontWeight: "fontWeightMedium", [narrowTitleRow]: visuallyHidden }}
      >
        {label}
      </Typography>
    </Box>
  );
}
