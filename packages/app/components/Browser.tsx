"use client";

import Box from "@mui/material/Box";
import {
  GenomeBrowser,
  createBrowserStore,
  createSettingsStore,
  createTrackStore,
  hg38,
} from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { TrackBaseSettings } from "@weng-lab/genomebrowser-tracks/shared";
import { TrackSelect } from "@weng-lab/genomebrowser-ui";
import { useLayoutEffect, useState } from "react";
import { RegionOverview } from "./RegionOverview";
import { BrowserHeader, NavigationControls } from "./Toolbars";
import { defaultTrackIds, trackCollections } from "../lib/trackCollections";
import { useObservedWidth } from "../hooks/useObservedWidth";

const marginWidth = 50;

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
  marginWidth,
  trackWidth: 1350,
});

const useTrackStore = createTrackStore({
  modules: firstPartyTrackModules,
  tracks: [],
});

const useSettingsStore = createSettingsStore({
  baseSettingsComponent: TrackBaseSettings,
});

export function Browser() {
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);
  const [containerRef, containerWidth] = useObservedWidth<HTMLElement>();
  const region = useBrowserStore((state) => state.region);

  useLayoutEffect(() => {
    if (containerWidth === 0) return;
    useBrowserStore.getState().setTrackWidth(Math.max(1, containerWidth - marginWidth));
  }, [containerWidth]);

  return (
    <main ref={containerRef}>
      <BrowserHeader onSelectTracks={() => setTrackSelectOpen(true)} />
      <NavigationControls browserStore={useBrowserStore} />
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
