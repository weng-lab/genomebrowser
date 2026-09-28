"use client";

import { compositeModule } from "@weng-lab/genomebrowser-tracks/composite";

import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

import Box from "@mui/material/Box";
import { GenomeBrowser, createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import type { CcreBigBedConfig, CcreBigBedRow } from "@weng-lab/genomebrowser-tracks/ccre";
import {
  HighlightDialog,
  ControlToolbar,
  TrackSelect,
  type TrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "@weng-lab/genomebrowser-ui";
import { useState } from "react";
import { browserAssembly } from "../lib/assembly";
import { defaultTrackIds, trackCollections } from "../lib/trackCollections";

const useBrowserStore = createBrowserStore({
  assembly: browserAssembly,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
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
    compositeModule.create({
      base: { id: "histone-signals", title: "H3K4me3 + H3K27ac", display: "overlay", height: 150 },
      source: "user",
      config: { opacity: 0.6, gap: 8 },
      tracks: [
        bigWigModule.create({
          base: { id: "histone-h3k4me3", title: "H3K4me3", color: "#527ac7", height: 90 },
          config: { url: "https://downloads.wenglab.org/H3K4me3_All_ENCODE_MAR20_2024_merged.bw" },
        }),
        bigWigModule.create({
          base: { id: "histone-h3k27ac", title: "H3K27ac", color: "#d2693c", height: 90 },
          config: { url: "https://downloads.wenglab.org/H3K27ac_All_ENCODE_MAR20_2024_merged.bw" },
        }),
      ],
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

  return (
    <Box sx={{ p: 1 }}>
      <ControlToolbar
        browserStore={useBrowserStore}
        search={{
          assembly: "GRCh38",
          graphqlUrl: "/api/screen-graphql",
          queries: ["Gene", "SNP", "cCRE", "Coordinate"],
        }}
        onManageHighlights={() => setHighlightDialogOpen(true)}
        onSelectTracks={() => setTrackSelectOpen(true)}
      />
      <Box sx={{ pt: 1, width: "100%", overflowX: "auto" }}>
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
    </Box>
  );
}
