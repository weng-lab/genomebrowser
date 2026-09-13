# cCRE BigBed

Use `ccreBigBedModule` for ENCODE candidate cis-regulatory elements stored in the aggregate cCRE BigBed layout. It expects a browser-accessible BigBed URL with the cCRE columns described below. The example creates a cCRE track from that source.

## ccreBigBedModule

Import `ccreBigBedModule`, `CcreBigBedCreateInput`, and `CcreBigBedConfig` from `@weng-lab/genomebrowser-tracks/ccre`. Register the module with core's track store before adding its instances.

`ccreBigBedModule.create(input, interaction?)` accepts `CcreBigBedCreateInput` and returns a validated track instance. `base.id` and `base.title` are required non-empty strings; `config` is required, with the fields below. Optional `source` defaults to `"user"`; `"host"` marks an application-owned source. Base display, height, and color use the defaults below. A supplied height must be positive and color must use six-digit `#RRGGBB` syntax.

`CcreBigBedCreateInput` permits omitted fields with defaults; `CcreBigBedConfig` describes the parsed config with defaults applied. `ccreBigBedModule.validate(instance)` validates an existing complete instance. Both methods throw on invalid input. `configSchema` and `createInputSchema` expose Zod parsing and safe parsing; the top-level config and create-input objects reject unknown keys. `displays` lists supported display names.

Pass callbacks as the second argument to `create`; they are runtime behavior, separate from serialized configuration. Callback support and payloads are described below. The module supplies its fetcher, renderers, settings, and tooltip to core.

## Minimal track

```ts
import { ccreBigBedModule } from "@weng-lab/genomebrowser-tracks/ccre";

const track = ccreBigBedModule.create({
  base: {
    id: "ccres",
    title: "cCREs",
  },
  config: { url: "YOUR_URL_HERE" },
});
```

## Displays and base defaults

| Field     | Supported or default            | Behavior                                                                      |
| --------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `display` | `"dense"` (default), `"squish"` | Dense uses one row; squish packs overlapping intervals into rows.             |
| `height`  | `12`                            | Initial height. Rendering derives total height from row count and row height. |
| `color`   | `"#4b9560"`                     | Fallback interval color; parsed cCRE colors take precedence.                  |

The module type is `"ccre-bigbed"`, so it can be registered alongside the generic BigBed module.

## Config

| Option      | Type     | Default  | Description                                                         |
| ----------- | -------- | -------- | ------------------------------------------------------------------- |
| `url`       | `string` | Required | Non-empty aggregate cCRE BigBed URL. Changing it requests new data. |
| `rowHeight` | `number` | `12`     | Complete vertical row slot; finite and at least 1 pixel.            |

The schema is fixed to `bedSchemas.ccre`; config does not accept a `bedSchema` option. Row-height changes reuse fetched data. Dense has exactly one row. Squish derives its total height from rows occupied by intervals intersecting the visible viewport, retaining overscanned side data for panning. Both use `max(1, rowCount) * rowHeight` and keep margins inside each slot.

## Sources, settings, and interactions

Use an HTTP(S) BigBed source that supports exact byte-range responses and browser CORS access. The module caches a reader per source URL in the track's fetch resources for the track lifetime. A new URL creates a reader on the next fetch. Network and column-validation failures reject the fetch. See [Data source troubleshooting](../../legacy/dataSources.md).

The settings panel provides a required URL field plus title, display, color, and coordinated Height and Row height controls. Host-owned tracks disable URL editing. `onClick`, `onHover`, and `onLeave` callbacks receive a `CcreBigBedRow` and the track's runtime context. The module reuses the generic BigBed rendering primitives while supplying its own parsed row type and tooltip.

## cCRE-specific parsing and tooltip

The module uses `bedSchemas.ccre`, available from `@weng-lab/genomebrowser-tracks/shared`. See [BED schemas](../dataPrimitives/bedSchemas.md#reuse-the-schemas) for direct reader usage. Colors must be `"0"` (normalized to `rgb(0,0,0)`) or three comma-separated integer channels from 0 through 255; invalid colors are rejected.

The module parses the seven columns after BED3 as `name`, numeric `score`, `strand`, numeric `thickStart`, numeric `thickEnd`, RGB `color`, and `ccreClass`. Schema property order matters because BigBed stores these values by position. Remaining columns stay in `fields`.

The cCRE tooltip shows the accession beside a square in the record color. It then shows the classification and genomic location.

## Exported API

| Export                  | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `ccreBigBedModule`      | Ready-to-register cCRE module.                               |
| `CcreBigBedCreateInput` | Input accepted by `ccreBigBedModule.create`.                 |
| `CcreBigBedConfig`      | Parsed config containing `url` and `rowHeight`.              |
| `CcreBigBedRow`         | BigBed coordinates plus the parsed cCRE fields listed above. |

Return to [Area index](README.md) or [Tracks API reference](../README.md).
