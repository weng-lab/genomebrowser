"use client";

import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  GenomeBrowser,
  createBrowserStore,
  createSettingsStore,
  createTrackStore,
} from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import type { CcreBigBedConfig, CcreBigBedRow } from "@weng-lab/genomebrowser-tracks/ccre";
import { TrackBaseSettings } from "@weng-lab/genomebrowser-tracks/shared";
import {
  HighlightDialog,
  TrackSelect,
  type TrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "@weng-lab/genomebrowser-ui";
import { useLayoutEffect, useState } from "react";
import { BrowserToolbar } from "./Toolbars";
import { browserAssembly } from "../lib/assembly";
import { defaultTrackIds, trackCollections } from "../lib/trackCollections";
import { useObservedWidth } from "../hooks/useObservedWidth";

const marginWidth = 100;

const useBrowserStore = createBrowserStore({
  assembly: browserAssembly,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
  marginWidth,
  trackWidth: 1350,
});

const useTrackStore = createTrackStore({
  modules: firstPartyTrackModules,
  tracks: [
    rulerModule.create({
      id: "reference-ruler",
      title: "Reference · hg38",
      config: { sequenceUrl: "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit" },
    }),
    bigWigModule.create({
      id: "user-source-example",
      title: "User-sourced BigWig",
      source: "user",
      config: {
        url: "https://downloads.wenglab.org/H3K4me3_All_ENCODE_MAR20_2024_merged.bw",
      },
    }),
  ],
});

const useSettingsStore = createSettingsStore({
  baseSettingsComponent: TrackBaseSettings,
});

const ccreInteraction: TrackSelectInteraction<CcreBigBedRow, CcreBigBedConfig> = {
  onClick: (item) => {
    console.log("cCRE BigBed row", item);
  },
};

const resolveTrackInteraction: TrackSelectInteractionResolver = ({ qualifiedTrackId }) =>
  qualifiedTrackId === "human-biosamples::ccre-aggregate" ? ccreInteraction : undefined;

export function Browser() {
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);
  const [containerRef, containerWidth] = useObservedWidth<HTMLElement>();

  useLayoutEffect(() => {
    if (containerWidth === 0) return;
    useBrowserStore.getState().setTrackWidth(Math.max(1, containerWidth - marginWidth));
  }, [containerWidth]);

  return (
    <main ref={containerRef}>
      <Typography variant="h4" component="h1">
        UMass Chan Genome Browser
      </Typography>
      <BrowserToolbar
        browserStore={useBrowserStore}
        onManageHighlights={() => setHighlightDialogOpen(true)}
        onSelectTracks={() => setTrackSelectOpen(true)}
      />
      <Box>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <GenomeBrowser
            browserStore={useBrowserStore}
            settingsStore={useSettingsStore}
            trackStore={useTrackStore}
          />
        </Box>
      </Box>
      <TrackSelect
        open={trackSelectOpen}
        onClose={() => setTrackSelectOpen(false)}
        title="Choose tracks"
        defaultTrackIds={defaultTrackIds}
        trackCollections={trackCollections}
        useTrackStore={useTrackStore}
        resolveTrackInteraction={resolveTrackInteraction}
      />
      <HighlightDialog
        browserStore={useBrowserStore}
        open={highlightDialogOpen}
        onClose={() => setHighlightDialogOpen(false)}
      />
    </main>
  );
}
