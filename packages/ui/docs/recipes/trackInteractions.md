# Track Interactions

Use an interaction resolver when tracks selected from a data-only collection need host application behavior. The resolver reconstructs callbacks from application code while TrackSelect keeps collection metadata separate from core runtime state.

This example uses one shared callback implementation across a heterogeneous collection. Metadata drives the collection columns and grouping, then helps the callback choose application behavior.

```tsx
import { useState } from "react";
import {
  TrackSelect,
  type TrackSelectCollection,
  type TrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "@weng-lab/genomebrowser-ui";
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const trackCollections = [
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
] satisfies TrackSelectCollection[];

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
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
  onClick(item, runtime, collection) {
    if (!isUrlConfig(runtime.config)) return;

    const sourceUrl = runtime.config.url;
    const trackColor = runtime.base.color;
    const interactionKind = collection.metadata.interaction;

    if (runtime.type === "bigwig" && interactionKind === "signal" && isSignalItem(item)) {
      openSignalDetails({ item, sourceUrl, trackColor, assay: collection.metadata.assay });
      return;
    }

    if (runtime.type === "bigbed" && interactionKind === "region" && isRegionItem(item)) {
      openRegionDetails({ item, sourceUrl, trackColor, assay: collection.metadata.assay });
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
        trackCollections={trackCollections}
        useTrackStore={useTrackStore}
        defaultTrackIds={defaultTrackIds}
        resolveTrackInteraction={resolveTrackInteraction}
        onCommittedTrackIds={(qualifiedIds) => saveSelectedTrackIds(qualifiedIds)}
      />
    </>
  );
}
```

Create the browser store, track store, collections, shared interaction, and resolver outside component rendering so their identities remain stable. Register every module named by the collection.

TrackSelect invokes the resolver for selected entries during default or explicit initialization and successful Submit reconciliation. It also applies authoritative resolver output to reused collection-owned tracks. Draft browsing and edits do not invoke it, and changing only resolver identity does not rewrite the store.

The callback runs later, when a renderer emits an item. Core supplies the current runtime context at that moment, so settings changes to the URL or color are visible without rerunning the resolver. The captured collection context supplies the owning collection ID, authored track ID, and metadata separately. Do not copy metadata into runtime config or base state.

Persist only the collection-qualified IDs reported by `onCommittedTrackIds`. Collection metadata remains in the collection, while callbacks are reconstructed from application code through `resolveTrackInteraction`; neither callbacks nor metadata belong in persisted track-selection data.

## Keep hover interactions responsive

`onHover` may run frequently as the pointer crosses dense track data. TrackSelect supplies the callback but does not impose one universal throttling policy across every registered module.

- Do not store transient hover state in the component that owns `GenomeBrowser` and `TrackSelect`; doing so can revisit both trees on every update.
- Place a hover preview's React state in the smallest leaf that renders the preview.
- Skip state updates when the item or derived preview has not changed.
- Use a ref for a rapidly changing imperative readout that does not need to participate in React rendering.
- Use a host-owned external store with narrow subscriptions when unrelated components need the current hover value.
- Deduplicate or rate-limit network requests, analytics, and other expensive effects separately from visual hover feedback.
- Use `onLeave` to clear retained hover state.

Start with state placement and semantic deduplication rather than wrapping the browser or resolver in memoization. Memoization cannot prevent rerenders caused by state owned above the browser.
