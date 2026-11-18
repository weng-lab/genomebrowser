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

This example assumes those IDs already exist. Alternatively pass `trackSets` to `createTrackStore`, alongside `tracks`. `TrackSetInput` requires `id`, `title` and a nonempty `readonly string[]` of `trackIds`; `visible` defaults to `true`. Optional `allowTrackTransfer` also behaves as `true` when omitted. `TrackSet` is the readonly resolved shape with `visible: boolean`.

A track may belong to one set. Nested sets, duplicate members, duplicate set IDs and missing child IDs are rejected. A set ID must also differ from track IDs. Membership references IDs rather than copying track configuration. Child order follows the store's track order, not the order of the membership array. Creating or pinning a set keeps its children contiguous.

## Actions

All actions return the store's [TrackMutationResult](trackStore.md#mutation-results).

| Action                                                          | Behavior                                                                                                                            |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `createTrackSet(input)`                                         | Validate membership and insert the set header before its children.                                                                  |
| `updateTrackSet(id, { title?, visible?, allowTrackTransfer? })` | Rename the set, show/hide its children, or enable/disable membership transfers without overwriting child settings.                  |
| `setTrackVisibility(trackId, visible)`                          | Change one child's independent visibility, also available for standalone tracks.                                                    |
| `updateTrackSetDisplay(id, display)`                            | Validate the mode against every child, then commit all changes atomically.                                                          |
| `moveTrackSet(id, direction)`                                   | Use `"up"` or `"down"` to move the children together past the adjacent set or standalone track. Pinned sets must be unpinned first. |
| `ungroupTrackSet(id)`                                           | Remove the parent while retaining every child, its configuration, order and individual visibility.                                  |

`trackSets` and `hiddenTrackIds` are store state and optional constructor inputs. Save them with the configured tracks to restore an embedding's state. Core does not persist them. Removing tracks prunes their membership and visibility; a set disappears when its last child is removed. `INVALID_TRACK_SET` reports invalid membership or metadata; `TRACK_SET_NOT_FOUND` reports an unknown parent ID.

Hiding a set suppresses rendering and new fetch demand for its children, aborts their pending requests and ignores late results. Successful child data and resources remain cached while the tracks exist. Showing the set reuses results that still cover the current demand, or fetches new data as necessary. One child's error does not replace healthy siblings.

## Settings UI

`GenomeBrowser` includes a MUI settings dialog for each set; no settings component prop is required. Open it through the rightmost gear in the header. Show/hide the parent, enable/disable moving tracks into or out of the set, independently enable children, choose a display mode supported by every child, and remove the set while retaining its tracks. Expand a child to edit its module settings. [TrackSettingsPanel](../03-trackDefinition/trackSettings.md#tracksettingspanel) scopes same-type batch changes to the set. Move and pin controls live in the header.

A thin rounded outline encloses the header and its visible children, ending before the next standalone track or set. It follows child visibility and row height; collapsing a set leaves an outline around its header. Header colors, typography, icon states, corner radii and the dialog inherit the host's MUI theme. Core does not install a theme provider or global CSS reset. Scientific track colors remain in each track's configuration.

The header provides show/hide, move-up, move-down, pin and settings icons. Each icon has a hover title and a keyboard-accessible button label. Movement skips over the adjacent set or standalone track. Pinned sets cannot move; the pin toggle affects every child while preserving other pinned tracks. Move and pin controls are disabled while data is loading.

## Dragging and membership

Drag a track by the blank area in its left control margin. Drop inside a set's header or between its child rows to join or reorder within the set. Drop above a set's header, at the bottom edge of its last visible child, or beside a standalone track to leave the set. The themed drop line is indented for an inside drop and spans the browser for an outside drop; its label names the destination. A collapsed set accepts a drop on its header and keeps the new child hidden until shown.

Set `allowTrackTransfer: false` when creating or updating a set to prevent individual tracks from entering or leaving it. Both the source and destination must allow a membership change. Invalid drag targets have no drop preview, the corresponding menu actions are disabled, and `moveTrackItem` returns `INTERACTION_BLOCKED` without changing state. Reordering children within that set and moving the whole set remain available. The settings switch can re-enable transfers. This option does not prevent explicit track deletion, removing the parent with `ungroupTrackSet`, or replacing store state.

```ts
useTrackStore.getState().updateTrackSet("regulatory", { allowTrackTransfer: false });
```

Drag the set's title to move all its children together. Sets cannot be nested. Pinned tracks and sets are stationary, and tracks cannot enter pinned sets. Escape, pointer cancellation, window blur, resizing, store replacement and intervening layout/data changes cancel a drag. Nothing changes until drop; successful placement retains each leaf's configuration, individual visibility and reusable data.

For keyboard access, focus a track's left-margin handle and press Enter, Space, Shift+F10 or the Context Menu key. Use the native menu's Move to track set or Remove from track set actions; arrow keys move between menu items and Escape closes it. Removing through the menu places the child immediately after its former set. Per-track top/bottom controls reorder a child within its current set. The header also provides Move up/Move down icons.

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

`TrackMoveSource` has `kind: "track" | "set"` and an existing `id`. `TrackMoveDestination` has optional `trackSetId` and `beforeTrackId`. Omit `trackSetId` for a standalone position; omit `beforeTrackId` to append to the destination. When targeting a set, the anchor must belong to that set. A root anchor inside a set means before the entire set. Track sets can only target root positions. Moving the final child out removes its now-empty parent. Hidden children retain their individual visibility; a hidden destination suppresses its new member's fetch demand.

## Prototype limits

Sets support one level of membership, visibility, shared display updates and movement as a unit. Pinning a child through the browser settings pins/unpins its entire set. Unpin a track or set before moving it or changing its membership.

Image downloads contain the visible child tracks; parent headers are not included. Signal overlays, shared numerical scales and inherited settings are outside this first version. The web app saves membership, transfer settings, parent visibility and independently hidden children with its session snapshots. Collection catalogs remain separate from runtime sets. The standalone example demonstrates the same built-in track-set controls and resets on reload.
