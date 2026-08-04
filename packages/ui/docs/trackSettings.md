# Track settings

Use the UI settings components to add MUI controls to the core browser's existing settings modal. The UI package currently provides settings-enabled modules for BigWig, BigBed, BulkBed, CAVE, methylC, and transcript tracks, plus an optional replacement for the shared base controls.

## Usage

Create the settings store and track store outside React rendering. Register the settings-enabled modules instead of their core equivalents, then pass all three stores to `GenomeBrowser`.

```tsx
import {
  createBrowserStore,
  createSettingsStore,
  createTrackStore,
  GenomeBrowser,
  hg38,
} from "@weng-lab/genomebrowser";
import {
  bigBedModuleWithSettings,
  bigWigModuleWithSettings,
  bulkBedModuleWithSettings,
  caveModuleWithSettings,
  methylCModuleWithSettings,
  TrackBaseSettings,
  transcriptModuleWithSettings,
} from "@weng-lab/genomebrowser-ui";

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
    bigWigModuleWithSettings,
    bigBedModuleWithSettings,
    bulkBedModuleWithSettings,
    caveModuleWithSettings,
    methylCModuleWithSettings,
    transcriptModuleWithSettings,
  ],
  tracks: [
    bigWigModuleWithSettings.create({
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

## Settings-enabled modules

Each UI module extends the corresponding core module with a `settingsComponent`. It preserves the core renderer, creation API, and interaction behavior.

| Export                         | Track type | Editable track configuration                                                                            |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------- |
| `bigWigModuleWithSettings`     | BigWig     | URL, fill missing values with zero, Y-axis minimum and maximum, clamp indicators, clamp indicator color |
| `bigBedModuleWithSettings`     | BigBed     | URL                                                                                                     |
| `bulkBedModuleWithSettings`    | BulkBed    | Dataset names and URLs, inter-dataset gap                                                               |
| `caveModuleWithSettings`       | CAVE       | Neurotransmitter, age, top color, bottom color                                                          |
| `methylCModuleWithSettings`    | MethylC    | Plus/minus strand channel URLs, channel colors, coverage mask, range                                    |
| `transcriptModuleWithSettings` | Transcript | Endpoint, assembly, version, highlighted gene, canonical color, highlight color                         |

Every modal also includes `TrackBaseSettings` for the title, color, height, and supported display modes.

## Component API

### TrackBaseSettings

Edits settings shared by every track.

| Prop             | Type                                                   | Default  | Description                                       |
| ---------------- | ------------------------------------------------------ | -------- | ------------------------------------------------- |
| `base`           | `TrackBase`                                            | Required | Current title, color, height, and display values. |
| `displayOptions` | `string[]`                                             | Required | Display modes supported by the active module.     |
| `updateBase`     | `(partial: Partial<TrackBase>) => TrackMutationResult` | Required | Applies a partial base-settings update.           |

### BigWigSettings, BigBedSettings, BulkBedSettings, CaveSettings, MethylCSettings, and TranscriptSettings

These components are already attached to their matching settings-enabled modules. They are also exported for applications composing a custom module.

| Prop           | Type                                                | Default  | Description                                       |
| -------------- | --------------------------------------------------- | -------- | ------------------------------------------------- |
| `id`           | `string`                                            | Required | Active track identifier.                          |
| `config`       | Matching track config type                          | Required | Current configuration for the matching component. |
| `updateConfig` | `(partial: Partial<Config>) => TrackMutationResult` | Required | Applies a partial track-configuration update.     |

## Accessibility

The existing core modal provides its heading, close action, dragging, and Escape-key behavior. All MUI form controls have visible labels. Disabled controls remain visible when their dependent option is off.

## Notes

Settings apply as fields change. Validation is intentionally limited to maintaining the runtime configuration types; data-source availability and biological compatibility are not checked by these forms.
