# Tracks

A track is one validated row in the browser. A registered track module supplies that row's config schema, defaults, fetching, renderers, display modes, and optional settings and tooltip components. Core owns this runtime contract but does not export curated track implementations.

Every `module.create` input has a unique `id`, a `title`, optional `display`, `height`, `color`, and `source`, plus module-specific `config`. Track colors use case-insensitive six-digit `#RRGGBB` syntax. A module supplies a default display and may supply height and color defaults; core falls back to `80` pixels, `"#000000"`, and `source: "user"`.

## Register a module

Applications may define their own modules or install a package that supplies them. The curated BigBed, BigWig, BulkBed, CAVE, cCRE BigBed, MethylC, and Transcript modules come from `@weng-lab/genomebrowser-tracks`:

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const signalTrack = bigWigModule.create({
  id: "signal",
  title: "Signal",
  config: { url: "YOUR_URL_HERE" },
});

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [signalTrack],
});
```

Register every module used by initial tracks, later mutations, or collection UI. The store resolves validation, requests, rendering, settings, and tooltips through `track.type`. An unregistered type is rejected, and track IDs must be unique.

The tracks package also exports `firstPartyTrackModules` when an application supports its complete module set. Consult that package's shipped docs for per-track config, defaults, source requirements, settings, tooltips, and domain types.

## Create and validate tracks

`module.create(input, interaction?)` validates create input, applies defaults, and returns a runtime instance:

```ts
const track = bigWigModule.create(
  {
    id: "signal",
    title: "Signal",
    display: "dense",
    height: 60,
    color: "#2266aa",
    config: { url: "YOUR_URL_HERE" },
  },
  {
    onHover(item, context) {
      console.info(item, context.base.title);
    },
  },
);
```

The resulting instance stores `type`, concrete base values, parsed config, a required `source`, and optional interaction callbacks. `module.create` defaults `source` to `"user"`. Pass `source: "host"` when the embedding application controls the track's data source. Settings components can use this field to disable source controls without disabling display or analysis controls. Core does not identify source fields or impose settings behavior.

Use `module.configSchema` to parse only module config or `module.createInputSchema` to parse the complete create input. `module.validate(instance)` validates the nested runtime form.

Optional interaction callbacks receive `(item, context)`. `context.type`, `context.base`, and `context.config` are the current shallow read-only runtime view, so later validated updates appear in later callbacks and tooltip renders. The item type and emitted callbacks are module-specific.

## Collection entries

A collection entry is create input plus a module `type` and optional collection metadata. `createTrackFromEntry(registry, entry)` removes `type` and `metadata`, then delegates to the selected module's `create`:

```ts
import { createModuleRegistry, createTrackFromEntry } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const registry = createModuleRegistry([bigWigModule]);
const entry = {
  type: "bigwig",
  id: "signal",
  title: "Signal",
  config: { url: "YOUR_URL_HERE" },
  metadata: { assay: "ATAC-seq" },
};

const track = createTrackFromEntry(registry, entry);
```

The result does not contain collection metadata. Create through a specific module when attaching typed interaction callbacks.

## Runtime updates

`updateTrack` accepts optional shallow `base`, `config`, and `interaction` patches, validates the complete candidate once, and commits every supplied section or none. Nested objects and arrays are replaced rather than recursively merged. Track ID and type are immutable; replace the instance when either identity must change.

A config-only update requests data only when a field marked by its module with `fetchOnChange` changes. Display changes request data because fetchers may return display-specific results. Other base fields, interactions, and unmarked visual config reuse current data.

See [Custom track modules](customTrackModules.md) to define a module and [Recipes](recipes.md) for track-store mutations.

## Pin tracks in order

Pass `pinnedTrackIds` to keep selected tracks at the top of the track stack. The first ID is the top row, the second sits directly below it, and all other tracks follow in their existing relative order. Pinning uses instance IDs and works with any registered module, including custom modules and multiple instances of the same module.

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { geneModule } from "@weng-lab/genomebrowser-tracks/gene";

const useTrackStore = createTrackStore({
  modules: [bigWigModule, geneModule],
  tracks: [
    bigWigModule.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    }),
    geneModule.create({
      id: "genes",
      title: "Genes",
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
  pinnedTrackIds: ["genes", "signal"],
});
```

Change the stack at runtime with one call:

```ts
useTrackStore.getState().setPinnedTrackIds(["signal", "genes"]);
useTrackStore.getState().setPinnedTrackIds([]); // Unpin every track.
```

| Option or member         | Type                                              | Default        | Description                                                                                                      |
| ------------------------ | ------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `pinnedTrackIds` option  | `readonly string[]`                               | `[]`           | Initial pinned IDs in top-to-bottom order. The store copies the array and keeps the first occurrence of each ID. |
| `pinnedTrackIds` state   | `readonly string[]`                               | Initial option | Current configured pins, including IDs whose tracks are absent.                                                  |
| `setPinnedTrackIds(ids)` | `(ids: readonly string[]) => TrackMutationResult` | —              | Replaces the pin list and updates `tracks` and `order` together. Returns `{ ok: true }`.                         |

- IDs may be configured before their tracks are added. Missing tracks occupy no space; adding them later places them in the configured order.
- Removing or replacing tracks, including through `setTracks` or `applyTrackChanges`, retains the pin list. Re-adding an ID restores its pinned placement.
- `reorderTracks` still requires every current track ID exactly once. It honors the requested relative order of unpinned tracks, then places pinned tracks first in their configured order. `addTrack` insertion indexes likewise cannot place a track above the pinned stack.
- Pinned rows cannot be dragged. Other rows can be dragged below the pinned stack. Use `setPinnedTrackIds` to reorder pinned rows.
- Unpinning keeps the current visible order; it does not restore an earlier order. Tracks remain removable, editable, and interactive while pinned.

Pinning fixes row order, not scroll position. The built-in coordinate ruler remains above the track stack; it is not currently a track instance. Once a ruler is supplied as a registered module, its instance ID can be pinned through this same API.
