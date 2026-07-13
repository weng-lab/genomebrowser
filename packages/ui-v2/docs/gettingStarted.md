# Getting Started

The key integration rule is to create the v2 stores and catalogs outside React rendering, then pass the same track store to both `GenomeBrowser` and `TrackSelect`. The browser renders committed tracks while TrackSelect stages and submits changes to that store.

```tsx
import { useState } from "react";
import { TrackSelect } from "@weng-lab/genomebrowser-ui-v2";
import {
  bigWigModule,
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
} from "@weng-lab/genomebrowser-v2";

const useBrowserStore = createBrowserStore({
  region: "chr1:1,000,000-1,100,000",
  trackWidth: 900,
});

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
});

const trackCatalogs = [
  {
    id: "signals",
    label: "Signal tracks",
    views: [
      {
        id: "by-assay",
        label: "By assay",
        columns: [
          { field: "assay", label: "Assay" },
          { field: "biosample", label: "Biosample" },
        ],
        grouping: ["assay"],
        leaf: "title",
      },
    ],
    tracks: [
      {
        type: "bigwig",
        id: "example-signal",
        title: "Example signal",
        config: { url: "YOUR_URL_HERE" },
        metadata: {
          assay: "ATAC-seq",
          biosample: "Example biosample",
        },
      },
    ],
  },
];

export function BrowserWithTrackSelect() {
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setTrackSelectOpen(true)}>
        Choose tracks
      </button>

      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />

      <TrackSelect
        open={trackSelectOpen}
        onClose={() => setTrackSelectOpen(false)}
        trackCatalogs={trackCatalogs}
        useTrackStore={useTrackStore}
      />
    </>
  );
}
```

`open` and `onClose` make the dialog controlled by the host. Catalog selections remain a draft until Submit; Cancel or closing the dialog does not update the store.

Reset is intended to restore the host-configured default track list in the draft. The default-list input is not yet part of the public API, so no defaults prop is shown here.

See [TrackSelect](trackSelect.md) for catalog rules, action semantics, limits, customization, and schema generation.
