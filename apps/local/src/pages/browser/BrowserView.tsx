import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { useState } from "react";

export function BrowserView() {
  // Each mounted view owns its live browser state.
  const [useBrowserStore] = useState(() =>
    createBrowserStore({
      assembly: hg38,
      region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
    }),
  );
  const [useTrackStore] = useState(() =>
    createTrackStore({
      modules: [rulerModule],
      tracks: [rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} })],
    }),
  );

  return <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />;
}
