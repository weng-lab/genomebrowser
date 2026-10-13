"use client";

import { formatDisplayRegion, GenomeBrowser } from "@weng-lab/genomebrowser";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { SaveStatus } from "./SaveStatus";
import { useSessionLoading } from "../../../browser/BrowserServer";
import { useBrowserSession } from "../../../browser/BrowserSession";

export function BrowserView() {
  const loading = useSessionLoading();
  return (
    <Box>
      <SaveStatus />
      {!loading && <BrowserContent />}
    </Box>
  );
}

function BrowserContent() {
  const { useBrowserStore, useTrackStore } = useBrowserSession();
  return (
    <>
      <VisibleRegion />
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </>
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
