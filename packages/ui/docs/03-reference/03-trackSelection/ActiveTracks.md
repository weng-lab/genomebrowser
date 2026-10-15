# ActiveTracks

`ActiveTracks` displays loaded runtime tracks using the same grouped tree as TrackSelect. It is a controlled view: the application supplies the tracks and handles removal requests.

## Usage

Pass the current tracks, collection catalog, and removal callback from your application. Keep the catalog array stable. The parent supplies a bounded height for the scrolling tree.

```tsx
import { ActiveTracks } from "@weng-lab/genomebrowser-ui";
import type { AnyTrackInstance, TrackCollection } from "@weng-lab/genomebrowser";

export function LoadedTrackList({
  tracks,
  collections,
  onRemove,
}: {
  tracks: AnyTrackInstance[];
  collections: TrackCollection[];
  onRemove: (ids: string[]) => void;
}) {
  return (
    <div style={{ height: 400 }}>
      <ActiveTracks tracks={tracks} trackCollections={collections} onRemoveTrackIds={onRemove} />
    </div>
  );
}
```

Remove the requested runtime IDs from your application's track store to update the browser and this list. The component does not change stores or save sessions itself.

## ActiveTracksProps

| Prop                       | Type                           | Default     | Description                                                                                                                                                                                   |
| -------------------------- | ------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tracks`                   | `AnyTrackInstance[]`           | Required    | Supplies loaded tracks in browser order. Runtime IDs must be unique. The count includes every supplied track.                                                                                 |
| `trackCollections`         | `TrackCollection[]`            | Required    | Supplies collection labels, metadata, and views. Use structurally valid catalogs; this read-only view does not validate module configuration. An empty array puts all tracks in Other tracks. |
| `resolveCollectionTrackId` | `TrackSelectTrackIdResolver`   | `undefined` | Matches application-owned runtime IDs to collection entries, following [existing-track matching](TrackSelect.md#trackselecttrackidresolver). Direct qualified IDs take precedence.            |
| `onRemoveTrackIds`         | `(trackIds: string[]) => void` | Required    | Receives actual runtime IDs when a leaf or group remove control is activated. Group removal includes all loaded descendant tracks.                                                            |

Collection roots follow their first appearance in the supplied tracks. Each collection uses its first view's grouping and leaf field. Runtime titles supply the title field; other metadata comes from the catalog. Tracks outside the catalog appear under Other tracks. Several runtime tracks matching one catalog entry remain separate loaded tracks, with their own IDs.

There is no draft, Submit, or Cancel. The application decides whether to apply removal immediately and how to display failures. Filter the supplied tracks to omit application-specific types such as a coordinate ruler; the count and removal controls then cover only that filtered list.

## Accessibility

The tree uses MUI X SimpleTreeView and TreeItem. Removal buttons use the accessible name `Remove {label}`. Collection roots expand and collapse; group and leaf removal buttons request the corresponding runtime IDs.

## Notes

The host supplies its MUI theme. The tree fills its parent's height and scrolls within that area. The current tree expansion state belongs to the mounted view and resets on remount.

[Back to track selection](README.md)
