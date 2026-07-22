# Getting Started

The key integration rule is to create the runtime stores and catalogs outside React rendering, then pass the same track store to both `GenomeBrowser` and `TrackSelect`. The browser renders committed tracks while TrackSelect stages and submits changes to that store.

```tsx
import { useState } from "react";
import { TrackSelect } from "@weng-lab/genomebrowser-ui";
import {
  bigWigModule,
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
} from "@weng-lab/genomebrowser";

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

const defaultTrackIds = ["signals::example-signal"];

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
        defaultTrackIds={defaultTrackIds}
      />
    </>
  );
}
```

`open` and `onClose` make the dialog controlled by the host. Catalog selections remain a draft until Submit; Cancel or closing the dialog does not update the store.

`defaultTrackIds` immediately adds catalog tracks to the shared store in the supplied order, so the browser renders them without opening the dialog or submitting a draft. IDs use the public `${catalogId}::${trackId}` format. Reset restores this ordered list; without defaults, Reset clears all catalog tracks while preserving tracks outside the catalogs.

When restoring a saved selection, pass it as `initialTrackIds` and keep the page's recommended tracks in `defaultTrackIds`. Explicit initial tracks take precedence only during initialization, so Reset still returns to the page defaults. Use `onCommittedTrackIds` to save the ordered catalog selection after a successful Submit. Storage access and parsing remain application responsibilities.

Use `resolveTrackInteraction` when catalog-created tracks need host callbacks. The resolver receives the owning catalog ID, qualified ID, and authored track entry during initialization and successful Submit reconciliation. Its callbacks later receive the semantic item, current core runtime context, and separate catalog metadata. Catalog JSON and persisted selection IDs remain data-only.

See [TrackSelect](trackSelect.md) for catalog rules, action semantics, limits, customization, and schema generation. See [Track interactions](recipes/trackInteractions.md) for a complete resolver integration.
