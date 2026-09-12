# Export contract

The package has one subpath for each track and one `/shared` subpath for module-author components and helpers. The root exports only `firstPartyTrackModules`.

## Modules and schemas

Each track subpath exports one module object:

| Track       | Package entry | Module export      | Type value      |
| ----------- | ------------- | ------------------ | --------------- |
| BigBed      | `/bigbed`     | `bigBedModule`     | `"bigbed"`      |
| BigWig      | `/bigwig`     | `bigWigModule`     | `"bigwig"`      |
| BulkBed     | `/bulkbed`    | `bulkBedModule`    | `"bulkbed"`     |
| CAVE        | `/cave`       | `caveModule`       | `"cave"`        |
| cCRE BigBed | `/ccre`       | `ccreBigBedModule` | `"ccre-bigbed"` |
| Gene        | `/gene`       | `geneModule`       | `"gene"`        |
| MethylC     | `/methylc`    | `methylCModule`    | `"methylc"`     |
| Transcript  | `/transcript` | `transcriptModule` | `"transcript"`  |

Each module implements `TrackModule` from `@weng-lab/genomebrowser`:

- `module.create(input, interaction?)` parses the input, applies defaults, and returns a runtime track instance.
- `module.validate(instance)` validates an existing runtime instance.
- `module.configSchema` is a strict Zod schema for module-specific config.
- `module.createInputSchema` is a strict Zod schema for `base` (required `id` and `title`, optional `display`, `height`, and `color`), optional `source`, and module-specific `config`.
- `module.displays` lists supported display modes.
- `module.fetch`, `module.render`, `module.settingsComponent`, and `module.tooltipComponent` are ready for the runtime to call.

The schemas reject unknown object keys. Create input requires non-empty `id` and `title`. If supplied, `height` must be positive and `color` must use six-digit `#RRGGBB` syntax.

Each module includes its settings component, tooltip component, renderer, and fetcher. The BigBed subpath also exports `fetchBigBedRows` for modules that reuse BigBed reading with a different Zod schema. Import other reusable settings controls, tooltip components, and pure track helpers from `@weng-lab/genomebrowser-tracks/shared`. See [Shared APIs](shared.md) for the full list and [Signal condensation](signal.md) for BigWig-to-pixel behavior.

The `/gene` subpath also exports `getGeneDatasetsForAssembly`, `getGeneDatasetTitle`, and the `GeneDataset` type for building assembly-specific reference collections. See [Gene reference datasets](tracks/gene.md#reference-datasets).

## Create-input and config types

Each track subpath exports `FooCreateInput` and `FooConfig`:

```ts
import {
  bigWigModule,
  type BigWigConfig,
  type BigWigCreateInput,
} from "@weng-lab/genomebrowser-tracks/bigwig";

const input: BigWigCreateInput = {
  base: {
    id: "signal",
    title: "Signal",
  },
  config: { url: "YOUR_URL_HERE" },
};

const track = bigWigModule.create(input);
const config: BigWigConfig = track.config;
```

`FooCreateInput` is the schema input type, so you may omit config properties that have defaults. `FooConfig` is the parsed runtime config type, so those properties always have values. The package derives both types from the exported module.

## Domain and interaction types

Each track subpath also exports that track's domain, data, display, and interaction types where applicable. Rendered signal points are shared: import `SignalPoint` from `/shared`. The track pages list these types. Interaction aliases use `TrackInteraction<Item, Config>` from core. Pass one as the second argument to `module.create`:

```ts
import { bigBedModule, type BigBedInteraction } from "@weng-lab/genomebrowser-tracks/bigbed";

const interaction: BigBedInteraction = {
  onClick(item, context) {
    console.info(item.chromosome, item.start, item.end, context.base.title);
  },
};

const track = bigBedModule.create(
  {
    base: {
      id: "regions",
      title: "Regions",
    },
    config: { url: "YOUR_URL_HERE" },
  },
  interaction,
);
```

Renderers do not all emit the same callbacks. Check the track page for supported interactions.

## Register the complete set

`firstPartyTrackModules` is a readonly tuple with the eight modules in this order: BigBed, BigWig, BulkBed, CAVE, cCRE BigBed, Gene, MethylC, Transcript.

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";

const useTrackStore = createTrackStore({ modules: firstPartyTrackModules });
```

Register individual modules if your application supports only some track types. Importing one track subpath does not load the other tracks. The store then rejects other types. Use the same module list to generate narrower collection schemas. Importing the package root loads all eight modules because it constructs `firstPartyTrackModules`.

## Ruler

`@weng-lab/genomebrowser-tracks/ruler` exports `rulerModule`, `RulerCreateInput`, `RulerConfig`, and `RulerData`. See [Ruler](tracks/ruler.md).

## BED schemas

The `/shared` subpath exports `bedSchemas`, `bedSchemaKeys`, `bedSchemaKeySchema`, and the `BedSchemaKey` type. Use a key in BigBed or BulkBed config, or pass `bedSchemas[key]` directly to a genomic reader. See [BED schemas](bedSchemas.md).

## Collection JSON schema

The package ships `@weng-lab/genomebrowser-tracks/trackSelectCollection.schema.json`, generated from all modules in `firstPartyTrackModules`. It describes TrackSelect collections and each track's create-input config, including the supported `bedSchema` keys.

For a collection JSON file in your project root, enable editor validation and completion with:

```json
{
  "$schema": "./node_modules/@weng-lab/genomebrowser-tracks/schemas/trackSelectCollection.schema.json"
}
```

This snippet shows the schema reference only; your collection still needs its required fields. Adjust the relative path for nested collection files. Tooling can resolve the public package subpath directly. Custom modules require a schema generated from your own module registry using the `trackselect` CLI from `@weng-lab/genomebrowser-ui`.
