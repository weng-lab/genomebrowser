import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { useBrowserContainer } from "../../hooks/useBrowserContainer";
import { useBrowserStore, useSettingsStore, useTrackStore } from "../../stores";
import BrowserControls from "./BrowserControls";

export default function BrowserView() {
  const containerRef = useBrowserContainer<HTMLDivElement>(useBrowserStore);

  return (
    <div className="browser-view" ref={containerRef}>
      <BrowserControls />
      <GenomeBrowser
        browserStore={useBrowserStore}
        settingsStore={useSettingsStore}
        trackStore={useTrackStore}
      />
    </div>
  );
}
