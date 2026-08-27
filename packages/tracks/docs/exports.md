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
- `module.createInputSchema` is a strict Zod schema for `id`, `title`, optional `display`, `height`, and `color`, plus module-specific `config`.
- `module.displays` lists supported display modes.
- `module.fetch`, `module.render`, `module.settingsComponent`, and `module.tooltipComponent` are ready for the runtime to call.

The schemas reject unknown object keys. Create input requires non-empty `id` and `title`. If supplied, `height` must be positive and `color` must use six-digit `#RRGGBB` syntax.

Each module includes its settings component, tooltip component, renderer, and fetcher. The BigBed subpath also exports `fetchBigBedRows` for modules that reuse BigBed reading with a different Zod schema. Import other reusable settings controls, tooltip components, and pure track helpers from `@weng-lab/genomebrowser-tracks/shared`. See [Shared APIs](shared.md) for the full list and [Signal condensation](signal.md) for BigWig-to-pixel behavior.

## Create-input and config types

Each track subpath exports `FooCreateInput` and `FooConfig`:

```ts
import {
  bigWigModule,
  type BigWigConfig,
  type BigWigCreateInput,
} from "@weng-lab/genomebrowser-tracks/bigwig";

const input: BigWigCreateInput = {
  id: "signal",
  title: "Signal",
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
    id: "regions",
    title: "Regions",
    config: { url: "YOUR_URL_HERE" },
  },
  interaction,
);
```

Renderers do not all emit the same callbacks. Check the track page for supported interactions.

## Register the complete set

`firstPartyTrackModules` is a readonly tuple with the eight modules in this order: BigBed, BigWig, BulkBed, CAVE, cCRE BigBed, Gene, MethylC, Transcript.

```ts
import { createModuleRegistry } from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";

const registry = createModuleRegistry(firstPartyTrackModules);
```

Register individual modules if your application supports only some track types. Importing one track subpath does not load the other tracks. The registry then rejects other types and produces narrower collection schemas. Importing the package root loads all eight modules because it constructs `firstPartyTrackModules`.
