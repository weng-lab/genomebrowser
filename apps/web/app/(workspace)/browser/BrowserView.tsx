"use client";

import { formatDisplayRegion, GenomeBrowser } from "@weng-lab/genomebrowser";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useBrowserSession } from "../../../session/BrowserSession";

export function BrowserView() {
  const { useBrowserStore, useTrackStore } = useBrowserSession();

  return (
    <Box>
      <VisibleRegion />
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </Box>
  );
}

function VisibleRegion() {
  const { useBrowserStore } = useBrowserSession();
  const region = useBrowserStore((state) => state.region);
  return (
    <Typography
      component="output"
      aria-label="Visible region"
      variant="body2"
      sx={{ display: "block", mb: 1 }}
    >
      {formatDisplayRegion(region)}
    </Typography>
  );
}
