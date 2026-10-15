"use client";

import { GenomeBrowser } from "@weng-lab/genomebrowser";
import {
  RegionControls,
  NavigationControls,
  InteractionControls,
} from "@weng-lab/genomebrowser-ui";
import Box from "@mui/material/Box";
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
      <Box
        role="group"
        aria-label="Genome browser controls"
        sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 1, mb: 2 }}
      >
        <RegionControls
          browserStore={useBrowserStore}
          search={{
            assembly: "GRCh38",
            graphqlUrl: "/api/screen-graphql",
            queries: ["Coordinate"],
          }}
        />
        <NavigationControls browserStore={useBrowserStore} />
        <InteractionControls browserStore={useBrowserStore} />
      </Box>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </>
  );
}
