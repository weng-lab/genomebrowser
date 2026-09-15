# cCRE BigBed

Use `ccreBigBedModule` for ENCODE candidate cis-regulatory elements stored in the aggregate cCRE BigBed layout. It expects a browser-accessible BigBed URL with the cCRE columns described below.

## Usage

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

## ccreBigBedModule

`ccreBigBedModule.create(input, interaction?)` returns a track with `type: "ccre-bigbed"`. Register `ccreBigBedModule` with the track store before adding its instances. See [Create and validate tracks](trackCreation.md) for required base fields, source ownership, schemas, and validation errors.

## Displays and base defaults

| Field     | Supported or default            | Behavior                                                                      |
| --------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `display` | `"dense"` (default), `"squish"` | Dense uses one row; squish packs overlapping intervals into rows.             |
| `height`  | `12`                            | Initial height. Rendering derives total height from row count and row height. |
| `color`   | `"#4b9560"`                     | Fallback interval color; parsed cCRE colors take precedence.                  |

Register cCRE and general BigBed modules together when the browser needs both types.

## Config

| Option      | Type     | Default  | Description                                                         |
| ----------- | -------- | -------- | ------------------------------------------------------------------- |
| `url`       | `string` | Required | Non-empty aggregate cCRE BigBed URL. Changing it requests new data. |
| `rowHeight` | `number` | `12`     | Complete vertical row slot; finite and at least 1 pixel.            |

The module always uses `bedSchemas.ccre`; config does not accept a `bedSchema` option. Changing row height reuses fetched data.

Dense has one row. Squish calculates its row count from features in the visible viewport while retaining data on either side for panning. Both displays use `max(1, rowCount) * rowHeight`, including margins inside each slot.

## Source requirements

Use an HTTP(S) BigBed source that supports exact byte-range responses and browser CORS access. The module caches a reader per source URL in the track's fetch resources for the track lifetime. A new URL creates a reader on the next fetch. Network and column-validation failures reject the fetch. See [Data source troubleshooting](../../legacy/dataSources.md).

## Settings and interactions

The settings panel provides a required URL field plus title, display, color, and coordinated Height and Row height controls. Host-owned tracks disable URL editing.

The module uses BigBed's renderers with its own row type and tooltip. `onClick`, `onHover`, and `onLeave` receive a `CcreBigBedRow` and the track's current runtime context.

## cCRE-specific parsing and tooltip

The module uses `bedSchemas.ccre`, available from `@weng-lab/genomebrowser-tracks/shared`. See [BED schemas](../dataPrimitives/bedSchemas.md#reuse-the-schemas) for direct reader usage. Colors accept `"0"`, which becomes `rgb(0,0,0)`, or three comma-separated integer channels from 0 through 255. Other values fail validation.

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
