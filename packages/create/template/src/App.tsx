import { useState } from "react";

import { Button } from "@mui/material";

import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { TrackSelect } from "@weng-lab/genomebrowser-ui";

import defaultTrackCollection from "../collections/default-tracks.json";
import RegionNavigation from "./components/RegionNavigation";
import { useBrowserContainer } from "./hooks/useBrowserContainer";
import { useBrowserStore, useSettingsStore, useTrackStore } from "./stores";

// Tracks loaded by default in the Track Select UI.
// IDs are the collection-id::track-id
const defaultTracks = [
  "default-tracks::genes",
  "default-tracks::ccre-aggregate",
  "default-tracks::dnase-aggregate",
];

export default function App() {
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);
  const containerRef = useBrowserContainer<HTMLElement>(useBrowserStore);

  return (
    <main ref={containerRef}>
      <Button onClick={() => setTrackSelectOpen(true)}>Track Select</Button>
      <RegionNavigation />
      <GenomeBrowser
        browserStore={useBrowserStore}
        settingsStore={useSettingsStore}
        trackStore={useTrackStore}
      />
      <TrackSelect
        open={trackSelectOpen}
        onClose={() => setTrackSelectOpen(false)}
        title="Select tracks"
        defaultTrackIds={defaultTracks}
        trackCollections={[defaultTrackCollection]}
        useTrackStore={useTrackStore}
      />
    </main>
  );
}
