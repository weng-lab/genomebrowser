"use client";

import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

import Box from "@mui/material/Box";
import { GenomeBrowser, createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import type { CcreBigBedConfig, CcreBigBedRow } from "@weng-lab/genomebrowser-tracks/ccre";
import {
  HighlightDialog,
  TrackSelect,
  type TrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "@weng-lab/genomebrowser-ui";
import { useState } from "react";
import { RegionOverview } from "./RegionOverview";
import { BrowserHeader, NavigationControls } from "./Toolbars";
import { browserAssembly } from "../lib/assembly";
import { defaultTrackIds, trackCollections } from "../lib/trackCollections";

const useBrowserStore = createBrowserStore({
  assembly: browserAssembly,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
  marginWidth: 50,
});

const useTrackStore = createTrackStore({
  modules: firstPartyTrackModules,
  tracks: [
    rulerModule.create({
      base: {
        id: "reference-ruler",
        title: "Reference · hg38",
      },
      config: { sequenceUrl: "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit" },
    }),
    bigWigModule.create({
      base: {
        id: "user-source-example",
        title: "User-sourced BigWig",
      },
      source: "user",
      config: {
        url: "https://downloads.wenglab.org/H3K4me3_All_ENCODE_MAR20_2024_merged.bw",
      },
    }),
  ],
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
  const region = useBrowserStore((state) => state.region);
  const highlights = useBrowserStore((state) => state.highlights);

  return (
    <main>
      <BrowserHeader
        onManageHighlights={() => setHighlightDialogOpen(true)}
        onSelectTracks={() => setTrackSelectOpen(true)}
      />
      <NavigationControls browserStore={useBrowserStore} />
      <RegionOverview
        chromosomeLength={browserAssembly.chromosomes[region.chromosome] ?? 0}
        region={region}
        highlights={highlights}
      />
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
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
