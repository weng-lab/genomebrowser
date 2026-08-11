"use client";

import Box from "@mui/material/Box";
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
} from "@weng-lab/genomebrowser";
import {
  BigBedSettings,
  BigBedTooltip,
  BigWigSettings,
  BigWigTooltip,
  MethylCSettings,
  MethylCTooltip,
  TrackBaseSettings,
  TrackSelect,
  TranscriptSettings,
  TranscriptTooltip,
} from "@weng-lab/genomebrowser-ui";
import { useLayoutEffect, useState } from "react";
import { RegionOverview } from "./_browser/RegionOverview";
import { BrowserHeader, NavigationControls } from "./_browser/Toolbars";
import { defaultTrackIds, trackCollections } from "./_browser/trackCollections";
import { useObservedWidth } from "./_browser/useObservedWidth";

const marginWidth = 50;

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
  const setRegion = useBrowserStore((state) => state.setRegion);

  useLayoutEffect(() => {
    if (containerWidth === 0) return;
    useBrowserStore.getState().setTrackWidth(Math.max(1, containerWidth - marginWidth));
  }, [containerWidth]);

  return (
    <main ref={containerRef}>
      <BrowserHeader onSelectTracks={() => setTrackSelectOpen(true)} />
      <NavigationControls assembly={assembly} region={region} setRegion={setRegion} />
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
