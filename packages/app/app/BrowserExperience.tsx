"use client";

import { useLayoutEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { GenomeSearch, type Result } from "@weng-lab/ui-components";
import {
  GenomeBrowser,
  bigBedModule,
  bigWigModule,
  createBrowserStore,
  createSettingsStore,
  createTrackStore,
  hg38,
  methylCModule,
  transcriptModule,
  type AssemblyDefinition,
  type GenomicRegion,
} from "@weng-lab/genomebrowser";
import {
  BigBedSettings,
  BigBedTooltip,
  BigWigSettings,
  BigWigTooltip,
  BrowserNavigationControls,
  Cytobands,
  MethylCSettings,
  MethylCTooltip,
  TrackBaseSettings,
  TrackSelect,
  TranscriptSettings,
  TranscriptTooltip,
} from "@weng-lab/genomebrowser-ui";
import { defaultTrackIds, trackCollections } from "./_browser/trackCollections";
import { useObservedWidth } from "./_browser/useObservedWidth";

const marginWidth = 50;
const screenAssembly = "GRCh38";

const transcriptUiModule = {
  ...transcriptModule,
  settingsComponent: TranscriptSettings,
  tooltipComponent: TranscriptTooltip,
} satisfies typeof transcriptModule;

const bigBedUiModule = {
  ...bigBedModule,
  settingsComponent: BigBedSettings,
  tooltipComponent: BigBedTooltip,
} satisfies typeof bigBedModule;

const bigWigUiModule = {
  ...bigWigModule,
  settingsComponent: BigWigSettings,
  tooltipComponent: BigWigTooltip,
} satisfies typeof bigWigModule;

const methylCUiModule = {
  ...methylCModule,
  settingsComponent: MethylCSettings,
  tooltipComponent: MethylCTooltip,
};

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
  marginWidth,
  trackWidth: 1350,
});

const useTrackStore = createTrackStore({
  modules: [transcriptUiModule, bigWigUiModule, bigBedUiModule, methylCUiModule],
  tracks: [],
});

const useSettingsStore = createSettingsStore({
  baseSettingsComponent: TrackBaseSettings,
});

export function BrowserExperience() {
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);
  const [containerRef, containerWidth] = useObservedWidth<HTMLElement>();
  const assembly = useBrowserStore((state) => state.assembly);
  const region = useBrowserStore((state) => state.region);

  useLayoutEffect(() => {
    if (containerWidth === 0) return;
    useBrowserStore.getState().setTrackWidth(Math.max(1, containerWidth - marginWidth));
  }, [containerWidth]);

  return (
    <main ref={containerRef}>
      <BrowserHeader onSelectTracks={() => setTrackSelectOpen(true)} />
      <BrowserToolbar assembly={assembly} region={region} />
      <RegionOverview region={region} />
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <GenomeBrowser
          browserStore={useBrowserStore}
          settingsStore={useSettingsStore}
          trackStore={useTrackStore}
        />
      </Box>
      <TrackSelect
        open={trackSelectOpen}
        onClose={() => setTrackSelectOpen(false)}
        title="Choose tracks"
        defaultTrackIds={defaultTrackIds}
        trackCollections={trackCollections}
        useTrackStore={useTrackStore}
      />
    </main>
  );
}

function BrowserHeader({ onSelectTracks }: { onSelectTracks: () => void }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography variant="h4">UMass Chan Genome Browser</Typography>
      <Button variant="contained" onClick={onSelectTracks}>
        Select tracks
      </Button>
    </Box>
  );
}

function BrowserToolbar({
  assembly,
  region,
}: {
  assembly: AssemblyDefinition;
  region: GenomicRegion;
}) {
  const setRegion = useBrowserStore((state) => state.setRegion);

  function handleSearchSubmit(result: Result) {
    if (result.domain) setRegion(result.domain);
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
      <GenomeSearch
        assembly={screenAssembly}
        graphqlUrl="/api/screen-graphql"
        onSearchSubmit={handleSearchSubmit}
        queries={["Gene", "SNP", "cCRE", "Coordinate"]}
        size="small"
        sx={{ width: "33.333%" }}
      />
      <BrowserNavigationControls assembly={assembly} region={region} onRegionChange={setRegion} />
    </Box>
  );
}

function RegionOverview({ region }: { region: GenomicRegion }) {
  const [cytobandContainerRef, cytobandWidth] = useObservedWidth<HTMLDivElement>();
  const regionLabel = formatRegion(region);
  const regionWidthLabel = `${(region.end - region.start).toLocaleString("en-US")} bp`;

  function copyRegion() {
    if (navigator.clipboard) void navigator.clipboard.writeText(regionLabel);
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2,
        alignItems: "center",
      }}
    >
      <ButtonBase
        aria-label="Copy current region to clipboard"
        onClick={copyRegion}
        sx={{ gap: 1, justifySelf: "start", whiteSpace: "nowrap" }}
      >
        <Typography component="span" variant="subtitle2">
          {regionLabel}
        </Typography>
        <Typography component="span" variant="caption" color="text.secondary">
          {regionWidthLabel}
        </Typography>
      </ButtonBase>
      <Box ref={cytobandContainerRef} sx={{ height: 18, lineHeight: 0, minWidth: 0 }}>
        {cytobandWidth > 0 ? (
          <Cytobands
            assembly={screenAssembly}
            chromosome={region.chromosome}
            colors={{ negative: "#e0e0e0" }}
            currentRegion={region}
            height={18}
            width={cytobandWidth}
          />
        ) : null}
      </Box>
    </Box>
  );
}

function formatRegion(region: GenomicRegion) {
  return `${region.chromosome}:${region.start.toLocaleString("en-US")}–${region.end.toLocaleString("en-US")}`;
}
