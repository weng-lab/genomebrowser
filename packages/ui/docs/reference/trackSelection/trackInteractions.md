# Track interactions

Attach application callbacks to collection-selected tracks through [TrackSelect](TrackSelect.md). Import the types on this page from `@weng-lab/genomebrowser-ui`; collection JSON remains data-only.

## Usage

```ts
import {
  type TrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "@weng-lab/genomebrowser-ui";

const interaction: TrackSelectInteraction<unknown> = {
  onClick(item, runtime, collection) {
    console.log(collection.collectionId, collection.authoredTrackId, runtime.type, item);
  },
};

export const resolveTrackInteraction: TrackSelectInteractionResolver = () => interaction;
```

Pass `resolveTrackInteraction` to TrackSelect. Use item and config types matching the selected module, or narrow unknown values in callbacks. See the [integration recipe](../../recipes/trackInteractions.md) for heterogeneous collections.

## TrackSelectInteractionResolver

`TrackSelectInteractionResolver` receives one object:

| Field              | Type                                | Description                                           |
| ------------------ | ----------------------------------- | ----------------------------------------------------- |
| `collectionId`     | `string`                            | Identifies the owning collection.                     |
| `qualifiedTrackId` | `string`                            | Provides the public `${collectionId}::${trackId}` ID. |
| `track`            | `TrackCollection["tracks"][number]` | Provides the parsed authored collection track.        |

Its return type is `AnyTrackSelectInteraction | undefined`. When supplied, resolver output is authoritative: `undefined` removes an existing interaction from a reused collection track, and a returned object replaces all callbacks rather than merging them.

The resolver runs for selected entries during initialization and Submit reconciliation, including reused tracks. It can run before a reconciliation fails; keep side effects in the event callbacks. Browsing and draft edits do not invoke it. Changing only resolver identity does not rewrite the store.

Without a resolver, reused tracks retain existing interactions. Invalid resolver objects, unknown callback names, and non-function callback values are rejected. An initialization failure throws; a Submit reconciliation failure leaves the store unchanged and displays an error in the dialog.

## TrackSelectInteraction and AnyTrackSelectInteraction

```ts
type TrackSelectInteraction<Item, Config = unknown> = {
  onClick?: (
    item: Item,
    runtime: TrackRuntimeContext<Config>,
    collection: TrackSelectCollectionContext,
  ) => void;
  onHover?: (
    item: Item,
    runtime: TrackRuntimeContext<Config>,
    collection: TrackSelectCollectionContext,
  ) => void;
  onLeave?: (
    item: Item,
    runtime: TrackRuntimeContext<Config>,
    collection: TrackSelectCollectionContext,
  ) => void;
};
type AnyTrackSelectInteraction = TrackSelectInteraction<never, never>;
```

`TrackRuntimeContext` comes from `@weng-lab/genomebrowser`. `AnyTrackSelectInteraction` is the erased resolver return type that accepts interactions for different module item and config types; use `TrackSelectInteraction<Item, Config>` when authoring callbacks.

| Callback  | Signature                             | Description                                       |
| --------- | ------------------------------------- | ------------------------------------------------- |
| `onClick` | `(item, runtime, collection) => void` | Runs when the renderer emits a click interaction. |
| `onHover` | `(item, runtime, collection) => void` | Runs when the renderer emits a hover interaction. |
| `onLeave` | `(item, runtime, collection) => void` | Runs when the renderer emits a leave interaction. |

Callbacks return `void`. The runtime context reflects the track when the renderer emits the event, including later settings changes. TrackSelect does not throttle callbacks or catch errors thrown by your event handlers.

## TrackSelectCollectionContext

| Field             | Type                      | Description                                                                       |
| ----------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `collectionId`    | `string`                  | Identifies the owning collection.                                                 |
| `authoredTrackId` | `string`                  | Provides the unqualified track ID authored in the collection.                     |
| `metadata`        | `Readonly<TrackMetadata>` | Provides the collection-owned metadata without copying it into the runtime track. |

The context is read-only. Missing authored metadata becomes an empty object. Metadata stays in the collection instead of being copied into runtime base or config.

[Back to track selection](README.md) · [TrackSelect props](TrackSelect.md#trackselectprops)
