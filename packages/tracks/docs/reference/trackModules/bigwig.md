# BigWig

Use `bigWigModule` to display quantitative signal from one BigWig file. The module includes full and dense displays, a settings form, and a signal tooltip.

## Usage

Import the module from `@weng-lab/genomebrowser-tracks/bigwig` and register it with core's track store:

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [
    bigWigModule.create({
      base: { id: "signal", title: "Signal" },
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});
```

Replace `YOUR_URL_HERE` with a browser-accessible BigWig URL. This creates a track in the default `full` display. Pass the track store and a browser store to `GenomeBrowser` to fetch and render it. [Use first-party tracks](../../gettingStarted/useTracks.md) provides a complete browser setup.

## bigWigModule

`bigWigModule.create(input, interaction?)` returns a track with `type: "bigwig"`. See [Create and validate tracks](trackCreation.md) for required base fields, source ownership, schemas, and validation errors.

| Base option | Default     | Description                                                        |
| ----------- | ----------- | ------------------------------------------------------------------ |
| `display`   | `"full"`    | Use `"full"` for signal height or `"dense"` for an intensity band. |
| `height`    | `80`        | Track height in logical SVG units.                                 |
| `color`     | `"#2266aa"` | Signal color.                                                      |

## Config

| Option                | Type             | Default     | Description                                                                                                                  |
| --------------------- | ---------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `url`                 | `string`         | Required    | Non-empty BigWig source URL. Changing it requests data from the selected source.                                             |
| `fillWithZero`        | `boolean`        | `false`     | Treats missing rendered pixels as zero for drawing, scaling, tooltips, and hover callbacks.                                  |
| `yRange`              | `YRangeOverride` | Unset       | Optional finite `min` and `max` bounds. Omitted bounds are automatic. When both are supplied, `min` must be less than `max`. |
| `showClampIndicators` | `boolean`        | `true`      | Marks values above or below the resolved range in full display.                                                              |
| `clampIndicatorColor` | `string`         | `"#ff0000"` | Six-digit `#RRGGBB` color for clamp marks, accepting either letter case.                                                     |

Among these config fields, only `url` changes invalidate fetched data. The remaining options update rendering from current data. Browser navigation and width changes can request data at a new region or resolution.

### Set a Y-axis range

Supply both bounds to keep a fixed range across regions or across several tracks:

```ts
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const track = bigWigModule.create({
  base: { id: "signal", title: "Signal" },
  config: {
    url: "YOUR_URL_HERE",
    yRange: { min: 0, max: 10 },
  },
});
```

Supply only `{ min: 0 }` to fix the lower bound while allowing the upper bound to follow the visible signal. Omit `yRange`, or use `{}`, for a completely automatic range.

The automatic range uses the smallest and largest signal values in the visible viewport. Signal retained outside the viewport for panning does not expand that range. With no values, or with a constant zero signal, the range is 0 to 1. A constant positive or negative signal uses a range between that value and zero. Otherwise, the range follows the observed minimum and maximum without forcing zero into view.

If a single supplied bound conflicts with the automatic bound, the renderer uses the entire automatic range for that render and retains the configured override. For example, `{ min: 5 }` falls back when the automatic maximum is 5 or less. An explicitly invalid pair is rejected during validation.

### Displays and missing values

Full display draws filled signal relative to a zero baseline clamped to the visible range. Negative minima use a lighter version of the track color. Values outside the range are clipped; when enabled, short clamp marks at the upper or lower edge identify the clipped columns.

Dense display draws a horizontal band whose intensity follows each pixel's maximum value within the same resolved range. It uses a lighter shade at the minimum and the track color at the maximum. It draws neither clamp marks nor vertical value labels.

By default, pixels with no records retain missing values. Full display omits their signal columns, and dense display gives them its lightest shade. Their tooltip reads **No data**, and they do not emit data hover callbacks. Enabling `fillWithZero` replaces missing values with zero before rendering and range calculation. Those pixels then show zero in the tooltip and participate in hover callbacks like other signal pixels.

### Value labels

Full display labels the resolved minimum and maximum, plus zero when the range crosses it and there is room. Labels stay at the visible plot edges during panning. They use monospace text on translucent white backgrounds and ignore pointer events. Overlapping labels are omitted, as are all labels on tracks shorter than 14 logical SVG units.

## Source requirements and fetching

Use an absolute HTTP(S) URL serving a BigWig file accessible from the browser. The server must support byte-range requests with `206 Partial Content` responses, correct byte lengths, and no HTTP content encoding. A different origin must permit browser requests through CORS. The file's assembly and chromosome names must match the browser's region. See [Data source troubleshooting](../../legacy/dataSources.md) for request diagnostics.

The config schema checks that `url` is a non-empty string. It does not contact the server or validate the file. Invalid URL syntax, network failures, and malformed file data can therefore fail during fetching even after track creation succeeds.

The fetcher chooses the coarsest BigWig zoom level whose reduction is no greater than half the requested bases per pixel, aiming for at least two summaries per pixel. If no suitable level exists, it reads unzoomed values. Both record forms are condensed into per-pixel minima and maxima by [condenseSignalRecords](../dataPrimitives/condenseSignalRecords.md).

Each mounted track keeps a file reader per URL in its fetch resources. The readers reuse file metadata and zoom levels across later requests. Switching URLs creates a reader for the new URL, or reuses an existing reader if that track has already visited it. The cache belongs to that track in that mounted browser; separate tracks do not share it. Core releases those resources when the track is removed or the browser unmounts.

## Settings

The built-in form includes title, display, color, height, URL, independent Y-axis bounds, the fill-missing-values switch, and clamp indicator controls. Disabling clamp indicators disables their color control while preserving its value. Dense display retains the clamp settings, although it does not draw their marks.

The URL field applies a draft only when **Set** is activated. With `source: "host"`, both the URL input and Set button are disabled; appearance controls remain available. Clearing either range field restores automatic calculation for that bound, and **Use automatic range** clears both overrides. See the shared [URL field](../settingsComponents/TrackSettingsUrlField.md) and [range fields](../settingsComponents/TrackSettingsRangeFields.md) for validation and commit behavior.

## Tooltip and interactions

The tooltip shows the hovered pixel's maximum signal value with two decimal places and thousands separators. It reports the maximum across that pixel's records, not their mean. Missing or non-finite maxima show **No data**. The pixel item is a [SignalPoint](../dataPrimitives/condenseSignalRecords.md#api), imported from `@weng-lab/genomebrowser-tracks/shared`. Its `x` is a rendered pixel column, not a genomic coordinate; `min` and `max` contain the aggregated signal values.

Pass application callbacks as the second argument to `create`:

```ts
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const track = bigWigModule.create(
  {
    base: { id: "signal", title: "Signal" },
    config: { url: "YOUR_URL_HERE" },
  },
  {
    onHover: (point, context) => {
      console.log(context.base.id, point.min, point.max);
    },
    onLeave: (_point, context) => {
      console.log("Left signal", context.base.id);
    },
  },
);
```

`BigWigInteraction` uses core's `TrackInteraction<SignalPoint, BigWigConfig>`. Each callback receives the pixel item and a context containing the current track `type`, resolved `base`, and parsed `config`.

Both displays emit `onHover` when the pointer moves to a different pixel containing signal. They emit `onLeave` for the last signal pixel when the pointer reaches a missing pixel or leaves the overlay. Moving directly between two signal pixels emits the new hover without an intervening leave. Although the shared interaction type permits `onClick`, BigWig's renderers do not emit it.

## Validation

Use `bigWigModule.configSchema` for config or `bigWigModule.createInputSchema` for creation input. The top-level objects reject unknown keys; the nested `yRange` object strips them. See [Validate external input](trackCreation.md#validate-external-input) for a `safeParse` example and instance validation.

## Exported types

All of the following types are exported from `@weng-lab/genomebrowser-tracks/bigwig`:

| Export              | Description                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `BigWigCreateInput` | Creation input, including required base ID, title, and config, with defaulted values optional.                       |
| `BigWigConfig`      | Parsed config: required URL, fill and clamp options, and optional range overrides.                                   |
| `BigWigDisplay`     | `"full"` or `"dense"`.                                                                                               |
| `BigWigData`        | Array of `BigWigRecord` values from `@weng-lab/genomic-reader`, containing unzoomed value records or zoom summaries. |
| `BigWigInteraction` | Optional application callbacks receiving `SignalPoint` and current BigWig runtime context.                           |
| `YRange`            | Numeric `{ min, max }` pair representing a complete signal range.                                                    |
| `YRangeOverride`    | Optional independent `{ min?, max? }` numeric bounds.                                                                |

Return to [Track modules](README.md) or [Tracks API reference](../README.md).
