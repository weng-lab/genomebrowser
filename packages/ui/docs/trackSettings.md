# Track settings

Use the UI track components to add MUI controls and detailed SVG tooltips to core BigWig, BigBed, BulkBed, CAVE, methylC, and transcript modules. The package also provides an optional replacement for the shared base settings controls.

## Usage

Create the settings store and track store outside React rendering. Extend each core module with its matching settings and tooltip components, register the composed modules, then pass all three stores to `GenomeBrowser`.

```tsx
import {
  bigBedModule,
  bigWigModule,
  bulkBedModule,
  caveModule,
  createBrowserStore,
  createSettingsStore,
  createTrackStore,
  GenomeBrowser,
  hg38,
  methylCModule,
  transcriptModule,
} from "@weng-lab/genomebrowser";
import {
  BigBedSettings,
  BigBedTooltip,
  BigWigSettings,
  BigWigTooltip,
  BulkBedSettings,
  BulkBedTooltip,
  CaveSettings,
  CaveTooltip,
  MethylCSettings,
  MethylCTooltip,
  TrackBaseSettings,
  TranscriptSettings,
  TranscriptTooltip,
} from "@weng-lab/genomebrowser-ui";

const bigBedUiModule = {
  ...bigBedModule,
  settingsComponent: BigBedSettings,
  tooltipComponent: BigBedTooltip,
} satisfies typeof bigBedModule;

const bigWigUiModule = {
  ...bigWigModule,
  settingsComponent: BigWigSettings,
  tooltipComponent: BigWigTooltip,
} satisfies typeof bigWigModule;

const bulkBedUiModule = {
  ...bulkBedModule,
  settingsComponent: BulkBedSettings,
  tooltipComponent: BulkBedTooltip,
} satisfies typeof bulkBedModule;

const caveUiModule = {
  ...caveModule,
  settingsComponent: CaveSettings,
  tooltipComponent: CaveTooltip,
} satisfies typeof caveModule;

const methylCUiModule = {
  ...methylCModule,
  settingsComponent: MethylCSettings,
  tooltipComponent: MethylCTooltip,
} satisfies typeof methylCModule;

const transcriptUiModule = {
  ...transcriptModule,
  settingsComponent: TranscriptSettings,
  tooltipComponent: TranscriptTooltip,
} satisfies typeof transcriptModule;

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
  trackWidth: 900,
});

const useSettingsStore = createSettingsStore({
  baseSettingsComponent: TrackBaseSettings,
});

const useTrackStore = createTrackStore({
  modules: [
    bigWigUiModule,
    bigBedUiModule,
    bulkBedUiModule,
    caveUiModule,
    methylCUiModule,
    transcriptUiModule,
  ],
  tracks: [
    bigWigUiModule.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});

export function Browser() {
  return (
    <GenomeBrowser
      browserStore={useBrowserStore}
      settingsStore={useSettingsStore}
      trackStore={useTrackStore}
    />
  );
}
```

Open settings with the settings action on a browser track. Applications can also call `useSettingsStore.getState().openSettings(trackId, position)`.

## Track-specific components

The UI package exports components rather than precomposed modules, so applications explicitly choose which UI behavior to install. Spreading the core module preserves its renderer, creation API, and interaction behavior.

| Track type | Settings component   | Tooltip component   | Editable track configuration                                                                            |
| ---------- | -------------------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| BigWig     | `BigWigSettings`     | `BigWigTooltip`     | URL, fill missing values with zero, Y-axis minimum and maximum, clamp indicators, clamp indicator color |
| BigBed     | `BigBedSettings`     | `BigBedTooltip`     | URL                                                                                                     |
| BulkBed    | `BulkBedSettings`    | `BulkBedTooltip`    | Dataset names and URLs, inter-dataset gap                                                               |
| CAVE       | `CaveSettings`       | `CaveTooltip`       | Neurotransmitter, age, top color, bottom color                                                          |
| methylC    | `MethylCSettings`    | `MethylCTooltip`    | Plus/minus strand channel URLs, channel colors, coverage mask, range                                    |
| Transcript | `TranscriptSettings` | `TranscriptTooltip` | Endpoint, assembly, version, highlighted gene, canonical color, highlight color                         |

Every modal also includes `TrackBaseSettings` for the title, color, height, and supported display modes.
At normal modal width, title and color share one row while display mode and height share another. Each pair stacks in the same order when its settings container is narrow. When a track supports only one display mode, the display control is omitted and height remains a single naturally sized field.

Track-specific controls follow the same container-responsive layout. Related range bounds, CAVE selectors and colors, transcript assembly metadata and colors, and each BulkBed dataset's name and URL share semantic rows when space allows, then stack in source order rather than compressing. BigWig and BigBed source URLs and the transcript endpoint and highlighted gene use the full settings width. MethylC source and color fields flow into as many usable columns as fit, while its coverage switch stays separate from the paired range controls. BigWig keeps its clamp indicator switch beside its dependent color when possible and separate from the fill-missing-values option.

`BigWigSettings` treats its Y-axis minimum and maximum as independent overrides. Leaving either field blank keeps that bound automatic, while clearing both fields restores a fully automatic range. It rejects a minimum greater than or equal to the maximum only when both fields contain explicit numbers and retains the invalid draft so you can correct it. `MethylCSettings` treats a manual range as a complete pair. A single entered bound remains available while you move between fields, but both bounds are required before the range updates. Use **Use automatic range** to clear the complete pair.

Color controls show a swatch and accept new values in six-digit hexadecimal `#RRGGBB` form. Entered values commit on blur or Enter, Escape restores the committed value, and invalid drafts remain visible with an error without updating the track. Existing CSS color strings and three-digit hexadecimal values remain visible until you replace them; their picker starts from the field's fallback without changing configuration merely by opening or cancelling it. Select the swatch to open saturation, brightness, and hue controls; picker changes preview continuously. Required base, BigWig clamp, and methylC colors cannot be cleared. CAVE and transcript overrides provide a clear action that restores their derived behavior.

Core validation materializes the BigWig clamp color's red default (`#ff0000`), so its field is always required and has no clear action. The complete control is disabled while clamp indicators are hidden. Because module settings do not receive the active base color, unset CAVE and transcript color pickers use a display-only neutral `#000000` fallback. CAVE's unset Top color picker shows a defensively lightened version of its explicit Bottom color, or lightened neutral black when Bottom is also unset. These display fallbacks are not written to configuration by rendering, opening, or cancelling a picker. An absent base Color similarly displays `#000000` without storing it until you enter or select a valid color.

## Component API

### TrackBaseSettings

Edits settings shared by every track.

| Prop             | Type                                                   | Default  | Description                                       |
| ---------------- | ------------------------------------------------------ | -------- | ------------------------------------------------- |
| `base`           | `TrackBase`                                            | Required | Current title, color, height, and display values. |
| `displayOptions` | `string[]`                                             | Required | Display modes supported by the active module.     |
| `updateBase`     | `(partial: Partial<TrackBase>) => TrackMutationResult` | Required | Applies a partial base-settings update.           |

### BigWigSettings, BigBedSettings, BulkBedSettings, CaveSettings, MethylCSettings, and TranscriptSettings

Assign the matching component to a core module's `settingsComponent` as shown above.

| Prop           | Type                                                | Default  | Description                                       |
| -------------- | --------------------------------------------------- | -------- | ------------------------------------------------- |
| `id`           | `string`                                            | Required | Active track identifier.                          |
| `config`       | Matching track config type                          | Required | Current configuration for the matching component. |
| `updateConfig` | `(partial: Partial<Config>) => TrackMutationResult` | Required | Applies a partial track-configuration update.     |

### BigWigTooltip, BigBedTooltip, BulkBedTooltip, CaveTooltip, MethylCTooltip, and TranscriptTooltip

Assign the matching component to a core module's `tooltipComponent`. The browser supplies these props when a renderer opens a tooltip for a semantic item.

BigWig, CAVE, and methylC signal tooltips keep their normal rows over empty pixels and display `No data`. Signal values use two decimal places. Optional numeric BED scores use at most two decimal places without forced trailing zeros.

| Prop      | Type                          | Default  | Description                                                      |
| --------- | ----------------------------- | -------- | ---------------------------------------------------------------- |
| `item`    | Matching track item type      | Required | Semantic item selected by the matching core renderer.            |
| `context` | `TrackRuntimeContext<Config>` | Required | Current track base settings and validated track-specific config. |

## Accessibility

The existing core modal provides its heading, close action, dragging, and Escape-key behavior. All MUI form controls have visible labels. A range error is described by both coordinated bound inputs without repeating the message. Disabled controls remain visible when their dependent option is off. Color picker controls have names for saturation, brightness, and hue, support keyboard slider operation, move focus into the picker when opened, and restore focus to the swatch button when closed. The selected hexadecimal value is also shown as text rather than communicated by its swatch alone.

## Notes

Settings generally apply as fields change. Manual color drafts apply on blur or Enter, while picker changes apply continuously. Validation is intentionally limited to maintaining the runtime configuration types; data-source availability and biological compatibility are not checked by these forms.
