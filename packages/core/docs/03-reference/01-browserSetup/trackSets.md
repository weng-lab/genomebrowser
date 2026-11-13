# Track sets

A track set is a one-level runtime container for existing tracks. Each child keeps its module, configuration, fetch resources, renderer, tooltip and error boundary. A set does not have a fetcher or combine datasets. A track collection is a catalog for selecting tracks; it is not a runtime track set.

## Create a set

After adding the child tracks to a store, create a set through its action:

```ts
useTrackStore.getState().createTrackSet({
  id: "regulatory",
  title: "Regulatory data",
  trackIds: ["signal-one", "signal-two", "annotations"],
});
```

This example assumes those IDs already exist. Alternatively pass `trackSets` to `createTrackStore`, alongside `tracks`. `TrackSetInput` requires `id`, `title` and a nonempty `readonly string[]` of `trackIds`; `visible` defaults to `true`. `TrackSet` is the readonly resolved shape with `visible: boolean`.

A track may belong to one set. Nested sets, duplicate members, duplicate set IDs and missing child IDs are rejected. A set ID must also differ from track IDs. Membership references IDs rather than copying track configuration. Child order follows the store's track order, not the order of the membership array. Creating or pinning a set keeps its children contiguous.

## Actions

All actions return the store's [TrackMutationResult](trackStore.md#mutation-results).

| Action                                     | Behavior                                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `createTrackSet(input)`                    | Validate membership and insert the set header before its children.                                                                 |
| `updateTrackSet(id, { title?, visible? })` | Rename the set or show/hide its children without overwriting child settings.                                                       |
| `setTrackVisibility(trackId, visible)`     | Change one child's independent visibility, also available for ungrouped tracks.                                                    |
| `updateTrackSetDisplay(id, display)`       | Validate the mode against every child, then commit all changes atomically.                                                         |
| `moveTrackSet(id, direction)`              | Use `"up"` or `"down"` to move the children together past the adjacent set or ungrouped track. Pinned sets must be unpinned first. |
| `ungroupTrackSet(id)`                      | Remove the parent while retaining every child, its configuration, order and individual visibility.                                 |

`trackSets` and `hiddenTrackIds` are store state and optional constructor inputs. Save them with the configured tracks to restore an embedding's state. Core does not persist them. Removing tracks prunes their membership and visibility; a set disappears when its last child is removed. `INVALID_TRACK_SET` reports invalid membership or metadata; `TRACK_SET_NOT_FOUND` reports an unknown parent ID.

Hiding a set suppresses rendering and new fetch demand for its children, aborts their pending requests and ignores late results. Successful child data and resources remain cached while the tracks exist. Showing the set reuses results that still cover the current demand, or fetches new data as necessary. One child's error does not replace healthy siblings.

## Settings UI

Core draws the header and show/hide control. Supply `GenomeBrowser.trackSetSettingsComponent` to add a Settings action. The component receives `TrackSetSettingsProps`: `trackSetId` and `closeSettings()`. It is mounted inside the browser context, so it can read the owning stores through `useGenomeBrowser`. The host component owns its dialog presentation, including keyboard and focus behavior.

The UI package supplies `TrackSetSettings`, a MUI implementation. Children keep their existing module settings forms. [TrackSettingsPanel](../03-trackDefinition/trackSettings.md#tracksettingspanel) binds those forms to an instance; its optional scope limits same-type batch changes to the set.

## Dragging and membership

Drag a track by the blank area in its left control margin. Drop inside a set's header or between its child rows to join or reorder within the set. Drop above a set's header, at the bottom edge of its last visible child, or beside a standalone track to leave the set. The blue line is indented for an inside drop and spans the browser for an outside drop; its label names the destination. A collapsed set accepts a drop on its header and keeps the new child hidden until shown.

Drag the set's title to move all its children together. Sets cannot be nested. Pinned tracks and sets are stationary, and tracks cannot enter pinned sets. Escape, pointer cancellation, window blur, resizing, store replacement and intervening layout/data changes cancel a drag. Nothing changes until drop; successful placement retains each leaf's configuration, individual visibility and reusable data.

For keyboard access, focus a track's left-margin handle and press Enter, Space, Shift+F10 or the Context Menu key. Use the native menu's Move to group or Remove from group actions; arrow keys move between menu items and Escape closes it. Removing through the menu places the child immediately after its former set. Per-track top/bottom controls reorder a child within its current set. The set's settings also provide Move up/Move down.

### moveTrackItem, TrackMoveSource and TrackMoveDestination

The store's `moveTrackItem(source, destination)` action atomically updates membership, `tracks` and `order`. It returns `TrackMutationResult`; invalid moves publish no partial update.

```ts
useTrackStore
  .getState()
  .moveTrackItem(
    { kind: "track", id: "signal-one" },
    { trackSetId: "regulatory", beforeTrackId: "annotations" },
  );
useTrackStore
  .getState()
  .moveTrackItem({ kind: "track", id: "signal-one" }, { beforeTrackId: "standalone-track" });
useTrackStore.getState().moveTrackItem({ kind: "set", id: "regulatory" }, {});
```

`TrackMoveSource` has `kind: "track" | "set"` and an existing `id`. `TrackMoveDestination` has optional `trackSetId` and `beforeTrackId`. Omit `trackSetId` for a standalone position; omit `beforeTrackId` to append to the destination. When targeting a set, the anchor must belong to that set. A root anchor inside a set means before the entire set. Groups can only target root positions. Moving the final child out removes its now-empty parent. Hidden children retain their individual visibility; a hidden destination suppresses its new member's fetch demand.

## Prototype limits

Sets support one level of membership, visibility, shared display updates and movement as a unit. Pinning a child through the browser settings pins/unpins its entire set. Unpin a track or set before moving it or changing its membership.

Image downloads contain the visible child tracks; parent headers are not included. Signal overlays, shared numerical scales and inherited settings are outside this first version. Web-session and collection serialization do not yet include runtime sets; the standalone example demonstrates the core/UI integration.
