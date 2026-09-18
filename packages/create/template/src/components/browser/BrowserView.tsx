import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { useBrowserStore, useTrackStore } from "../../stores";
import BrowserControls from "./BrowserControls";

export default function BrowserView() {
  return (
    <div className="browser-view">
      <BrowserControls />
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </div>
  );
}
