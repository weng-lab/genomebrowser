import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { useBrowserStore, useSettingsStore, useTrackStore } from "../../stores";
import BrowserControls from "./BrowserControls";

export default function BrowserView() {
  return (
    <div className="browser-view">
      <BrowserControls />
      <GenomeBrowser
        browserStore={useBrowserStore}
        settingsStore={useSettingsStore}
        trackStore={useTrackStore}
      />
    </div>
  );
}
