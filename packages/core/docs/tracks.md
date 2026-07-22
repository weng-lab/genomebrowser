# Tracks

Tracks are created by registered modules. Every module `create` input has a unique `id`, a `title`, optional `display`, `height`, and `color`, plus module-specific `config`. A module always supplies a default display and height. Color and config defaults are module-specific; required config must still be provided.

## Current built-in modules

The package currently exports these first-party modules:

- `bigWigModule`: quantitative BigWig signal
- `bigBedModule`: generic BigBed intervals
- `bulkBedModule`: multiple BigBed datasets in one row
- `transcriptModule`: transcript models from a host-owned GraphQL endpoint
- `methylCModule`: split-strand methylation channels
- `caveModule`: CAVE data

The built-in inventory and detailed support are still evolving. The minimum create inputs below reflect the current implementation; each module's `create` signature and runtime validation remain the source of truth for optional config. BigBed-derived renderer reuse is not a recommended public workflow at this stage.

| Module             | Minimum `config`                                           | Displays          |
| ------------------ | ---------------------------------------------------------- | ----------------- |
| `bigWigModule`     | `{ url: "YOUR_URL_HERE" }`                                 | `full`, `dense`   |
| `bigBedModule`     | `{ url: "YOUR_URL_HERE" }`                                 | `dense`, `squish` |
| `bulkBedModule`    | `{ datasets: [{ name: "Sample", url: "YOUR_URL_HERE" }] }` | `full`            |
| `transcriptModule` | `{ assembly: "GRCh38", version: 47 }`                      | `squish`, `pack`  |
| `caveModule`       | `{ neurotransmitter: "GABA", age: "Adulthood" }`           | `full`            |

`methylCModule` requires a URL entry for each methylation and depth channel. A URL may be an empty string when that channel has no data:

```ts
const methylCTrack = methylCModule.create({
  id: "methylation",
  title: "Methylation",
  config: {
    urls: {
      plusStrand: {
        cpg: { url: "YOUR_URL_HERE" },
        chg: { url: "" },
        chh: { url: "" },
        depth: { url: "YOUR_URL_HERE" },
      },
      minusStrand: {
        cpg: { url: "YOUR_URL_HERE" },
        chg: { url: "" },
        chh: { url: "" },
        depth: { url: "YOUR_URL_HERE" },
      },
    },
  },
});
```

Create Transcript tracks normally when the host implements the conventional proxy route:

```ts
import { createTrackStore, transcriptModule } from "@weng-lab/genomebrowser";

const transcriptTrack = transcriptModule.create({
  id: "genes",
  title: "Genes",
  config: {
    assembly: "GRCh38",
    version: 47,
  },
});

const useTrackStore = createTrackStore({
  modules: [transcriptModule],
  tracks: [transcriptTrack],
});
```

Transcript defaults to `/api/screen-graphql`. The host must implement that route as a GraphQL POST endpoint or provide a different non-secret `config.endpoint`. The module does not read a service key or construct an authorization header, so authenticated services should be reached through a host-owned server proxy that adds credentials server-side. The browser's normal `fetch` credential behavior still applies, including same-origin cookies. CAVE selects from package-defined datasets rather than accepting a URL. These service-specific modules may not fit every deployment.

`defaultScreenGraphQlEndpoint` exports the default route string for hosts that need to share the same value with their own routing or request code.

## Registration

Register every module used by initial tracks, later mutations, or catalog UI:

```ts
import { bigWigModule, createTrackStore } from "@weng-lab/genomebrowser";

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [
    bigWigModule.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});
```

The store resolves validation, requests, rendering, settings, and tooltips through `track.type`. An unregistered type is rejected. Track IDs must be unique.

Optional interaction callbacks are passed as the second argument to `module.create(...)`; their item and parsed-config types are module-specific. Each callback receives `(item, context)`, where `context.type`, `context.base`, and `context.config` are the current shallow read-only runtime view. One-argument callbacks remain valid when they do not need context.

Renderers continue to call item-only handlers from `useInteraction<Item>()`. Module tooltip components receive `{ item, context }`, and renderers open them with parameterless `useTooltip<Item, Config>()`. Later base and config updates appear in later callbacks and tooltip renders. Runtime context is derived rather than persisted and contains no metadata from optional catalog UI packages.

For catalog-shaped create input, `createTrackFromEntry(registry, entry)` strips `type` and `metadata` before delegating to the selected module. It remains a data-only creation boundary and returns the registry's instance union. Create through a specific module when attaching typed interactions. Use `"YOUR_URL_HERE"` for URLs supplied by your application.
