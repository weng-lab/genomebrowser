# Using track collections

> This guide is awaiting migration. See the [documentation index](../README.md) for reviewed references and the [migration queue](README.md) for remaining topics.

Use a collection to load configured tracks or provide choices through TrackSelect. See the reviewed [collection reference](../reference/collections.md) for fields, validation, and schema CLI options.

## Load a collection into a browser

```ts
import { createTrackStore, type AnyTrackModule } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { validateJson } from "@weng-lab/genomebrowser";

const modules: AnyTrackModule[] = [bigWigModule];
const useTrackStore = createTrackStore({ modules });
const collection = validateJson(
  {
    assembly: "hg38",
    id: "signals",
    tracks: [
      {
        type: "bigwig",
        base: { id: "signal-1", title: "Signal 1" },
        config: { url: "YOUR_URL_HERE" },
      },
    ],
  },
  modules,
);

const tracks = collection.tracks.map(({ type, base, config }) => {
  const module = modules.find((module) => module.type === type);
  if (!module) throw new Error(`Unsupported track type: ${type}`);
  return module.create({ base, config });
});
const result = useTrackStore.getState().setTracks(tracks);
if (!result.ok) console.error(result.error);
```

Direct creation uses authored track IDs. When combining collections, your application must ensure runtime IDs are unique. TrackSelect uses its documented `${collectionId}::${trackId}` IDs.

To serialize configured runtime tracks, select their `type`, `base`, and `config` fields. Keeping resolved base and config values preserves the user's current settings when the collection is loaded again. Do not serialize interaction callbacks or runtime ownership policy as collection fields.

## Collection views in TrackSelect

With one collection, TrackSelect opens directly on its detail screen. With multiple collections, it opens on the collection list.

The active view determines the order of newly added tracks. Groups follow their first appearance in collection order, nested groups follow `grouping`, and tracks within the final group retain collection order. Switching views can therefore change insertion order on Submit.

In a grouped view, each group checkbox summarizes all selectable descendant tracks, including tracks in nested groups. An unchecked or partially selected group can select all of its descendants, and a fully selected group can deselect them. Groups are grid interactions rather than tracks: TrackSelect keeps only collection-qualified leaf track IDs in the draft, runtime store, and `onCommittedTrackIds` callback.

TrackSelect assigns host source ownership to collection-created tracks. Interaction callbacks and collection-qualified IDs belong to application/UI integration rather than collection JSON.

## Editor schema workflow

Export the same module array used by the application, then run the [schema CLI](../reference/collections.md#schema-cli) and commit the generated file. Set each collection's `$schema` to the generated file's relative location. Regenerate it when the module set or configuration schemas change, and use `--check` in CI to detect stale output.

Editor feedback checks representable schema rules. It does not assign a static TypeScript type to imported JSON or replace runtime parsing. Use the same modules for the track store, schema generation, and validation. TrackSelect validates its supplied collections; direct integrations use `validateJson` before creating instances.
