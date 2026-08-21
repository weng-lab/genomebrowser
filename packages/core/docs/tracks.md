# Tracks

A track is one validated row in the browser. A registered track module supplies that row's config schema, defaults, fetching, renderers, display modes, and optional settings and tooltip components. Core owns this runtime contract but does not export curated track implementations.

Every `module.create` input has a unique `id`, a `title`, optional `display`, `height`, and `color`, plus module-specific `config`. Track colors use case-insensitive six-digit `#RRGGBB` syntax. A module supplies a default display and may supply height and color defaults; core falls back to `80` pixels and `"#000000"`.

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

The resulting instance stores `type`, concrete base values, parsed config, and optional interaction callbacks. Use `module.configSchema` to parse only module config or `module.createInputSchema` to parse the complete create input. `module.validate(instance)` validates the nested runtime form.

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
