# Track store

The track store holds the tracks displayed by a browser and their order. It also registers the modules that know how to validate and render those tracks. Use its actions to add, edit, remove, or pin tracks, then pass the store to [GenomeBrowser](GenomeBrowser.md).

## Usage

Create each track through its module, then register that module when creating the store:

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const signalTrack = bigWigModule.create({
  base: { id: "signal", title: "Signal" },
  config: { url: "YOUR_URL_HERE" },
});

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [signalTrack],
});
```

Replace `YOUR_URL_HERE` with your BigWig URL. Keep the returned Zustand hook stable and give its variable a `use` prefix. Create separate stores for browsers that need independent track lists. Application controls and collection UI can share the same store as the browser.

Call actions through `useTrackStore.getState()` outside rendering, or subscribe with a selector in React. The examples below use the store and module from this setup. For creating custom track types, see [custom track modules](../../legacy/customTrackModules.md).

## createTrackStore and TrackStoreOptions

`createTrackStore(options): TrackStoreInstance<Modules>` builds a module registry, validates the initial tracks, and places pinned tracks first. It does not fetch data; a mounted browser coordinates requests for the tracks in the store.

| Option           | Type                        | Default  | Description                                                                                                                                                    |
| ---------------- | --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules`        | `readonly AnyTrackModule[]` | Required | Modules available to initial tracks, later mutations, and collection UI. Each module must have a unique `type`. An empty array is allowed for an empty store.  |
| `tracks`         | `AnyTrackInstance[]`        | `[]`     | Initial runtime instances, validated through their registered modules. Track IDs must be unique.                                                               |
| `pinnedTrackIds` | `readonly string[]`         | `[]`     | IDs to place first, in top-to-bottom order. Missing IDs are reserved for later additions. The store copies the list and keeps the first occurrence of each ID. |

`TrackStoreOptions<Modules, Track>` preserves the supplied module-array and track types when describing factory input. `Modules` extends `readonly AnyTrackModule[]`; `Track` extends `AnyTrackInstance`. Both default to those broad types. The factory infers `Modules` from the supplied modules and returns `TrackStoreInstance<Modules>`. Its registry retains those module types; stored tracks remain heterogeneous `AnyTrackInstance` values.

Construction throws for duplicate module types, duplicate track IDs, unknown track types, or module-invalid initial instances. Register every module the store will need at creation; its registry has no action for adding modules later. Registering a module makes its type available but does not add a track.

## TrackStore and TrackStoreInstance

`TrackStore<Modules>` contains the state below and the actions documented on this page. All actions maintain `tracks` and `order` together.

| State            | Type                      | Description                                                          |
| ---------------- | ------------------------- | -------------------------------------------------------------------- |
| `tracks`         | `AnyTrackInstance[]`      | Validated instances in display order, including pinned tracks first. |
| `order`          | `string[]`                | The same order represented by each instance's `base.id`.             |
| `pinnedTrackIds` | `readonly string[]`       | Configured pins, including IDs whose tracks are absent.              |
| `registry`       | `ModuleRegistry<Modules>` | The modules available to this store, indexed by track type.          |

`TrackStoreInstance<Modules>` is `UseBoundStore<StoreApi<TrackStore<Modules>>>`: a Zustand selector hook with `getState()`, `subscribe()`, and the underlying store API. Use the track actions to preserve validation and ordering; direct state writes or mutations of returned objects bypass those checks. Unsubscribe from external subscriptions when their owner is disposed. Unmounting a browser does not discard an application-owned store.

### getTrack

`getTrack(id: string): AnyTrackInstance | undefined` finds an instance by `base.id`. It returns `undefined` when the ID is absent. It returns the stored instance, not a detached copy; edit it with `updateTrack`.

```ts
const title = useTrackStore.getState().getTrack("signal")?.base.title;
```

### ModuleRegistry

A registry connects each track's `type` to its module. `registry.modules` is a readonly, frozen copy of the original module array. `registry.get(type)` returns the matching module and throws if the type is absent. Copying the array does not clone or freeze the module objects themselves.

`ModuleRegistry<Modules>` can retain specific module types when supplied with a typed module tuple; the default is `readonly AnyTrackModule[]`. A typed registry's `get` signature narrows its result to the matching module where possible. The factory preserves this inference through `useTrackStore.getState().registry`, so looking up a known literal module type retains its specific `create` input and interaction types. `TrackStore` and `TrackStoreInstance` also default to `readonly AnyTrackModule[]`; explicitly annotating a store with the default type gives it a general registry. This inference does not associate string track IDs with configuration types in `getTrack` or `updateTrack`.

Use a specific module's `create` method when you need its typed configuration and interaction callbacks. Collection entries must become runtime instances before being passed to store actions; see [collection input](../collectionsAndSchemas/trackCollection.md#track-inputs).

## Mutation results

All mutations below return `TrackMutationResult`:

```ts
import type { TrackMutationResult } from "@weng-lab/genomebrowser";

function reportTrackChange(result: TrackMutationResult) {
  if (!result.ok) console.error(result.error);
}
```

The result is `{ ok: true }` or `{ ok: false; code: TrackMutationErrorCode; error: string }`. A rejected mutation leaves the existing tracks and order unchanged. A successful mutation commits synchronously; it does not wait for data loading or rendering. Schema validation failures from `defineTrackModule` become failure results during mutations, even though the same failures throw during construction. Unexpected exceptions from custom validation code propagate. Express expected validation failures through the module schema.

`MutationFailure<Code extends string>` is the shared failure shape `{ ok: false; code: Code; error: string }`. Branch on `code` for application logic and use `error` for display; message text is not a stable identifier.

`TrackMutationErrorCode` contains:

| Code                   | Meaning                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `INVALID_TRACK`        | Instance or settings input fails validation.                  |
| `UNKNOWN_TRACK_MODULE` | No module is registered for the instance type.                |
| `DUPLICATE_TRACK_ID`   | The resulting track list would contain a repeated ID.         |
| `TRACK_NOT_FOUND`      | An update or removal names an absent track.                   |
| `INVALID_TRACK_ORDER`  | Order does not contain every current ID exactly once.         |
| `INTERACTION_BLOCKED`  | A hosted settings mutation is disabled during an interaction. |

These contracts assume arguments with the documented shapes. The actions are not general parsers for arbitrary JavaScript values. Use module or collection schemas to validate external input.

## Adding and removing tracks

### addTrack

`addTrack<Track extends AnyTrackInstance>(track: Track, index?: number): TrackMutationResult` validates and inserts a runtime instance. An unknown module, invalid instance, or ID already in the store produces a failure result.

Omit `index` to append. An explicit index uses JavaScript array insertion rules: zero inserts at the beginning, negative values count from the end, and values beyond the array bounds insert at the nearest end. Pin ordering is applied afterward, so an unpinned track cannot be inserted above the pinned tracks.

```ts
const secondTrack = bigWigModule.create({
  base: { id: "signal-2", title: "Second signal" },
  config: { url: "YOUR_URL_HERE" },
});

const added = useTrackStore.getState().addTrack(secondTrack);
if (!added.ok) console.error(added.error);
```

### removeTrack

`removeTrack(id: string): TrackMutationResult` removes an existing track. A missing ID produces a failure result. Removing a pinned track retains its ID in `pinnedTrackIds`, so adding it again restores its pinned placement.

## Updating a track

`updateTrack<Config, InteractionItem = unknown>(id: string, update: TrackUpdate<Config, InteractionItem>): TrackMutationResult` edits an existing track. It merges the supplied patches, validates the complete candidate once, and commits all supplied changes or none. A missing ID produces a failure result.

### TrackUpdate and TrackBaseUpdate

| Patch         | Type                                                 | Description                                                                                                  |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `base`        | `TrackBaseUpdate`                                    | Optional changes to title, display, height, or color. `TrackBaseUpdate` is `Partial<Omit<TrackBase, "id">>`. |
| `config`      | `Partial<Config>`                                    | Optional changes to the module's configuration. The registered module validates the resulting config.        |
| `interaction` | `Partial<TrackInteraction<InteractionItem, Config>>` | Optional changes to instance callbacks. Unspecified callbacks are retained.                                  |

Each section is merged shallowly. A nested object or array supplied in a patch replaces its previous value rather than merging recursively. Omitting a section preserves it. The current ID, type, source, and track order are retained; replace the instance to change its identity or source.

```ts
const updated = useTrackStore.getState().updateTrack("signal", {
  base: { title: "Renamed signal", height: 100 },
  config: { fillWithZero: true },
  interaction: { onLeave: () => undefined },
});
if (!updated.ok) console.error(updated.error);
```

A config change requests new data when a field marked by the module with `fetchOnChange` changes. Display changes also request data. Other base fields, callbacks, and unmarked config changes reuse current data. See [request behavior](../trackDefinition/fetchingData.md#requests-and-result-lifetime) for the mounted browser's coordination rules.

## Replacing tracks atomically

Use one operation when several membership changes must succeed together. Calling `removeTrack` followed by `addTrack` separately can leave the first change committed if the second fails.

### applyTrackChanges

`applyTrackChanges<Track extends AnyTrackInstance>(changes: { add?: Track[]; remove?: string[] }): TrackMutationResult` removes the listed IDs and appends the validated additions in one state update. Both lists default to empty.

Every removal ID must exist. Repeated removal IDs are treated as one removal. The resulting list must have unique IDs, so you can replace an instance by removing and adding the same ID in this call. Any failed validation, missing removal ID, or duplicate resulting ID rejects the entire operation.

```ts
const replacement = bigWigModule.create({
  base: { id: "signal", title: "Replacement signal" },
  config: { url: "YOUR_URL_HERE" },
});

const replaced = useTrackStore.getState().applyTrackChanges({
  remove: ["signal"],
  add: [replacement],
});
if (!replaced.ok) console.error(replaced.error);
```

Remaining tracks retain their relative order, additions follow them, and pinned tracks are placed first. A replacement therefore does not automatically inherit its previous unpinned position. The pin list is preserved.

### setTracks

`setTracks<Track extends AnyTrackInstance>(tracks: Track[]): TrackMutationResult` replaces the entire track list. It validates all instances and rejects duplicate IDs before committing. The supplied order determines the unpinned order; configured pins still come first. Passing `[]` removes every track while retaining the registry and pin list.

## Ordering and pinning

Pinning keeps selected tracks at the top of the track list. It fixes row order, not scroll position. Any track instance can be pinned, including a ruler supplied by a registered module.

### reorderTracks

`reorderTracks(ids: string[]): TrackMutationResult` requires every current track ID exactly once. Missing, repeated, or unknown IDs produce a failure result.

The store preserves the requested relative order of unpinned tracks and places pins first in their configured order. For example, with pins `["b", "a"]`, a requested order of `["d", "a", "c", "b"]` becomes `["b", "a", "d", "c"]`.

```ts
const reversed = useTrackStore
  .getState()
  .reorderTracks([...useTrackStore.getState().order].reverse());
if (!reversed.ok) console.error(reversed.error);
```

### setPinnedTrackIds

`setPinnedTrackIds(ids: readonly string[]): TrackMutationResult` replaces the pin list and updates display order. It copies the list, removes duplicates while keeping their first occurrence, and returns `{ ok: true }`. IDs do not need to exist yet; absent tracks occupy no space and take their reserved position when added.

```ts
useTrackStore.getState().setPinnedTrackIds(["signal-2", "signal"]);
useTrackStore.getState().setPinnedTrackIds([]); // Unpin all tracks, keeping their current order.
```

Removing, replacing, or clearing tracks does not clear pins. Unpinning keeps the current visible order rather than restoring an earlier order. In the browser, pinned rows cannot be dragged and their move-to-top/bottom controls are disabled, but they remain editable and removable. Use `setPinnedTrackIds` to change their order.

## Context hooks

Components rendered inside `GenomeBrowser` use [useGenomeBrowser](useGenomeBrowser.md#usegenomebrowser) to resolve `useTrackStore`. Call it with a selector to subscribe, or use `useTrackStore.getState()` for imperative actions.

To access the hosting browser's module registry, select `state.registry` from the resolved `useTrackStore`. The local factory result in Usage accesses a particular application-owned store and can be used outside a mounted browser.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
