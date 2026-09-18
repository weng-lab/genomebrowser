# TrackHeightSettings

Add a Height field with a 20-pixel minimum to a module settings form.

## Usage

```tsx
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import type { BigWigConfig } from "@weng-lab/genomebrowser-tracks/bigwig";
import {
  TrackBaseSettings,
  TrackHeightSettings,
  type SignalPoint,
} from "@weng-lab/genomebrowser-tracks/shared";

function SignalSettings(props: TrackSettingsProps<BigWigConfig, SignalPoint>) {
  return (
    <TrackBaseSettings {...props}>
      <TrackHeightSettings {...props} />
    </TrackBaseSettings>
  );
}
```

## API

Height edits require a finite value of at least 20 pixels. Apply to all sends the same height to every track of this exact type. Rejected edits retain their draft and show the mutation error.

This component accepts core's `TrackSettingsProps<Config, Item>`. It has no separate exported props type.

| Prop                 | Type                                                                                                               | Default  | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| `track`              | `ReadonlyTrackInstance<Config, Item>`                                                                              | Required | Current accepted track.                                                        |
| `displayOptions`     | `readonly string[]`                                                                                                | Required | Part of the settings contract; unused by this section.                         |
| `updateTrack`        | `(update: TrackUpdate<Config, Item>) => TrackMutationResult`                                                       | Required | Validates and commits an individual edit.                                      |
| `updateTracksOfType` | `(createUpdate: (track: ReadonlyTrackInstance<Config, Item>) => TrackUpdate<Config, Item>) => TrackMutationResult` | Required | Atomically updates every track of this exact type, including the active track. |

## Accessibility

Fields have visible labels and validation errors. The dimension action is named "Apply Height to all tracks of this type". Rows stack at narrow widths.

## Notes

See [Author track settings](../../legacy/trackSettings.md) for form composition and browser hosting.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
