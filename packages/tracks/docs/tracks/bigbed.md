# BigBed

`bigBedModule` renders genomic intervals from one BigBed file.

## Minimal track

```ts
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";

const track = bigBedModule.create({
  id: "peaks",
  title: "Peaks",
  config: { url: "YOUR_URL_HERE" },
});
```

## Displays and base defaults

| Field     | Supported or default            | Behavior                                                                                                  |
| --------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `display` | `"dense"` (default), `"squish"` | Dense draws intervals in one band. Squish packs overlapping intervals into rows and adjusts track height. |
| `height`  | `60`                            | Initial height in pixels.                                                                                 |
| `color`   | `"#4b9560"`                     | Fallback interval color when a row has no color.                                                          |

## Config

| Option | Type     | Default  | Description                                                 |
| ------ | -------- | -------- | ----------------------------------------------------------- |
| `url`  | `string` | Required | Non-empty BigBed source URL. Changing it requests new data. |

Use `bigBedModule.configSchema` to validate config and `bigBedModule.createInputSchema` to validate the full create input.

## Source requirements

The source must be an absolute public HTTP(S) BigBed URL. The server must return `206 Partial Content` for exact byte-range requests and allow browser requests through CORS. The fetcher reads BED3 coordinates. It leaves additional columns as strings in `BigBedRow.fields`.

## Settings and tooltip

The settings panel has one required URL field. It applies a change after the field passes validation.

When available, the interval name becomes the tooltip title. The tooltip also shows the genomic location and any strand or score value. The renderer passes the corresponding `BigBedRow` to supplied `onClick`, `onHover`, and `onLeave` callbacks.

## Exported types

| Export                    | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| `BigBedCreateInput`       | Input accepted by `bigBedModule.create`.                              |
| `BigBedConfig`            | Parsed config with `url`.                                             |
| `BigBedDisplay`           | `"dense" \| "squish"`.                                                |
| `BigBedData`              | Array of `BigBedRow` records.                                         |
| `BigBedRow`               | Coordinates, raw extra fields, and optional BED-like metadata.        |
| `RenderedBigBedRect<Row>` | Row plus rendered interval bounds and optional presentation metadata. |
| `BigBedInteraction`       | Interaction callbacks receiving `BigBedRow` and `BigBedConfig`.       |
