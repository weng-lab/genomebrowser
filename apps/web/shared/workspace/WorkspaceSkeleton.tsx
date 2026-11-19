"use client";

import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Skeleton from "@mui/material/Skeleton";
import { alpha, ThemeProvider, type Theme } from "@mui/material/styles";
import { railSx } from "../ui/NavRail";
import { titleRowSx } from "./frame/layout";
import { theme } from "../ui/theme";

/**
 * Placeholder in the workspace frame's shape, shown while the workspace loads. It renders
 * outside `Workspace`, so it supplies the theme itself.
 */
export function WorkspaceSkeleton() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        component="output"
        aria-label="Loading workspace"
        aria-busy
        sx={{ display: "flex", height: "100dvh", overflow: "hidden" }}
      >
        <Box sx={railSx}>
          {/* Icon buttons are 40px with an 8px inset icon. */}
          {[0, 1].map((index) => (
            <Box key={index} sx={{ p: 1 }}>
              <Skeleton variant="circular" width={24} height={24} sx={onRailSx} />
            </Box>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ p: 1 }}>
            <Skeleton variant="circular" width={24} height={24} sx={onRailSx} />
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
          <Box sx={titleRowSx()}>
            <Skeleton variant="text" width={160} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flexGrow: 1, p: 1 }}>
            <Skeleton variant="text" width={220} />
            <Skeleton variant="rounded" sx={{ flexGrow: 1, height: "auto" }} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

/** A light tint, so the rail's placeholders show on navy. */
const onRailSx = {
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.16),
} as const;
