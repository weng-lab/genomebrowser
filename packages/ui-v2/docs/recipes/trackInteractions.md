# Track Interactions

Use an interaction resolver when tracks selected from a data-only catalog need host application behavior. The resolver reconstructs callbacks from application code while TrackSelect keeps catalog metadata separate from core runtime state.

This example uses one shared callback implementation across a heterogeneous catalog. Metadata drives the catalog columns and grouping, then helps the callback choose application behavior.

```tsx
import { useState } from "react";
import {
  TrackSelect,
  type TrackSelectCatalog,
  type TrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "@weng-lab/genomebrowser-ui-v2";
import {
  GenomeBrowser,
  bigBedModule,
  bigWigModule,
  createBrowserStore,
  createTrackStore,
} from "@weng-lab/genomebrowser-v2";

const trackCatalogs = [
  {
    id: "signals",
    label: "Signals and regions",
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
        id: "accessibility",
        title: "Accessibility signal",
        config: { url: "YOUR_URL_HERE" },
        metadata: {
          assay: "ATAC-seq",
          biosample: "Example tissue",
          interaction: "signal",
        },
      },
      {
        type: "bigbed",
        id: "peaks",
        title: "Accessibility peaks",
        config: { url: "YOUR_URL_HERE" },
        metadata: {
          assay: "ATAC-seq",
          biosample: "Example tissue",
          interaction: "region",
        },
      },
    ],
  },
] satisfies TrackSelectCatalog[];

const useBrowserStore = createBrowserStore({
  region: "chr1:1,000,000-1,100,000",
  trackWidth: 900,
});

const useTrackStore = createTrackStore({
  modules: [bigWigModule, bigBedModule],
});

type SignalItem = { x: number; min: number | null; max: number | null };
type RegionItem = { start: number; end: number };
type UrlConfig = { url: string };
type MetadataValue = string | number | boolean | null | undefined;

// Host-owned application integrations. Implement these functions in your app.
declare function openSignalDetails(details: {
  item: SignalItem;
  sourceUrl: string;
  trackColor: string | undefined;
  assay: MetadataValue;
}): void;
declare function openRegionDetails(details: {
  item: RegionItem;
  sourceUrl: string;
  trackColor: string | undefined;
  assay: MetadataValue;
}): void;
declare function saveSelectedTrackIds(qualifiedIds: readonly string[]): void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSignalItem(item: unknown): item is SignalItem {
  return isRecord(item) && typeof item.x === "number" && "max" in item;
}

function isRegionItem(item: unknown): item is RegionItem {
  return isRecord(item) && typeof item.start === "number" && typeof item.end === "number";
}

function isUrlConfig(config: unknown): config is UrlConfig {
  return isRecord(config) && typeof config.url === "string";
}

const sharedInteraction: TrackSelectInteraction<unknown, unknown> = {
  onClick(item, runtime, catalog) {
    if (!isUrlConfig(runtime.config)) return;

    const sourceUrl = runtime.config.url;
    const trackColor = runtime.base.color;
    const interactionKind = catalog.metadata.interaction;

    if (runtime.type === "bigwig" && interactionKind === "signal" && isSignalItem(item)) {
      openSignalDetails({ item, sourceUrl, trackColor, assay: catalog.metadata.assay });
      return;
    }

    if (runtime.type === "bigbed" && interactionKind === "region" && isRegionItem(item)) {
      openRegionDetails({ item, sourceUrl, trackColor, assay: catalog.metadata.assay });
    }
  },
};

const resolveTrackInteraction: TrackSelectInteractionResolver = ({ track }) =>
  track.metadata.interaction === "signal" || track.metadata.interaction === "region"
    ? sharedInteraction
    : undefined;

const defaultTrackIds = ["signals::accessibility"];

export function BrowserWithTrackInteractions() {
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
        resolveTrackInteraction={resolveTrackInteraction}
        onCommittedTrackIds={(qualifiedIds) => saveSelectedTrackIds(qualifiedIds)}
      />
    </>
  );
}
```

Create the browser store, track store, catalogs, shared interaction, and resolver outside component rendering so their identities remain stable. Register every module named by the catalog.

TrackSelect invokes the resolver for selected entries during default or explicit initialization and successful Submit reconciliation. It also applies authoritative resolver output to reused catalog-owned tracks. Draft browsing and edits do not invoke it, and changing only resolver identity does not rewrite the store.

The callback runs later, when a renderer emits an item. Core supplies the current runtime context at that moment, so settings changes to the URL or color are visible without rerunning the resolver. The captured catalog context supplies the owning catalog ID, authored track ID, and metadata separately. Do not copy metadata into runtime config or base state.

Persist only the catalog-qualified IDs reported by `onCommittedTrackIds`. Catalog metadata remains in the catalog, while callbacks are reconstructed from application code through `resolveTrackInteraction`; neither callbacks nor metadata belong in persisted track-selection data.
