# Handle collection track interactions

Use `resolveTrackInteraction` to attach application callbacks to tracks created from collections. Collection files remain data-only. The application supplies the callback code when TrackSelect initializes or submits a selection.

Start with the browser and collection from [Choose tracks from collections](trackSelection.md). The example below adds a resolver to that picker.

## Attach one click callback

Define a resolver at file scope. This example logs the clicked item and the track that produced it, without assuming a particular renderer item shape:

```ts
import type { TrackSelectInteractionResolver } from "@weng-lab/genomebrowser-ui";

const resolveTrackInteraction: TrackSelectInteractionResolver = ({ collectionId }) => {
  if (collectionId !== "signals") return undefined;
  return {
    onClick(item, runtime) {
      console.info("Track item selected", {
        item,
        trackId: runtime.base.id,
        title: runtime.base.title,
        assay: runtime.metadata.assay,
      });
    },
  };
};
```

Add `resolveTrackInteraction={resolveTrackInteraction}` to the existing TrackSelect element. Replace the log with the application's details panel or another action appropriate to the selected item.

TrackSelect calls the resolver when applying the initial selection and on Submit, including for tracks already in the store. Browsing, changing a draft, or canceling does not call it. Passing a different resolver function alone does not update callbacks on existing tracks.

The returned callback runs later, when the user interacts with a rendered item.

## Read runtime values and collection metadata

A callback receives three arguments. `item` is the data item under the pointer, such as a signal value or a genomic feature. `runtime` is the track now: its base settings, config, and metadata. `collection` is the entry the track came from: its collection, authored ID, and authored metadata.

Read anything that can change from `runtime` inside the callback. For example, `runtime.base.color` reflects a color change made after the track was selected, and `runtime.metadata` includes a tag added later. TrackSelect copies the entry's metadata onto the track as its starting metadata, so the two match until someone edits the track. Read `collection.metadata` when you need the values the collection authored, regardless of later edits.

Do not capture a copy of the initial config in the resolver when the action needs the current config. The callback's runtime argument supplies that current value without resolving the interaction again.

## Share behavior across track types

The first callback also works across module types because it reads common track settings and logs the item without inspecting its fields. Use that approach when the application needs the track's identity or metadata regardless of its type.

For actions that use item-specific fields, such as a feature's start and end coordinates, return a callback typed for that module. Use the module's public item and config types. A callback shared across different item shapes must check those shapes before reading their fields.

When TrackSelect applies a selection, the resolver's result replaces each selected collection track's callbacks. Returning `undefined` removes them. Supply only supported callbacks, `onClick`, `onHover`, and `onLeave`; invalid output prevents the track update and leaves the store unchanged.

## Restore callbacks with saved selections

Save qualified track IDs through `onCommittedTrackIds`, as shown in the [selection guide](trackSelection.md#restore-and-save-a-selection). Pass the resolver when restoring those IDs so TrackSelect can attach callbacks from application code. The saved IDs contain neither callbacks nor collection metadata.

## Keep hover feedback responsive

Renderers may emit hover events frequently. Put preview state in the smallest component that displays it, or use a shared store with narrow subscriptions when several components need the preview. Keeping hover state above the browser can rerender the browser tree on every pointer update.

Skip updates when the displayed item has not changed, and clear retained feedback with `onLeave`. Deduplicate or rate-limit network requests separately from visual feedback. A callback does not need to trigger a request for every pointer event.

See the [interaction reference](../03-reference/03-trackSelection/trackInteractions.md) for the complete resolver and callback contracts.
