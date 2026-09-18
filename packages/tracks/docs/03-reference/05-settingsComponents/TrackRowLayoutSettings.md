# TrackRowLayoutSettings

Add Height and Row height fields for a module whose config includes `rowHeight`. Each edit preserves its derived row count.

## Usage

```tsx
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import type { BigBedConfig, BigBedRow } from "@weng-lab/genomebrowser-tracks/bigbed";
import { TrackBaseSettings, TrackRowLayoutSettings } from "@weng-lab/genomebrowser-tracks/shared";

function IntervalSettings(props: TrackSettingsProps<BigBedConfig, BigBedRow>) {
  return (
    <TrackBaseSettings {...props}>
      <TrackRowLayoutSettings {...props} />
    </TrackBaseSettings>
  );
}
```

## API

The generic `Config` must extend `RowLayoutConfig`.

Changing Height calculates a new row height. Changing Row height calculates a new total height. Each edit submits both values together, preserving the nearest whole row count with a minimum of one row. Apply to all preserves each matching track's own row count.

Row height must be at least 1 pixel, so the minimum total height equals the row count in pixels. Rejected edits retain their draft and show the mutation error.

This component accepts core's `TrackSettingsProps<Config, Item>`. It has no separate exported props type.

| Prop                 | Type                                                                                                               | Default  | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| `track`              | `ReadonlyTrackInstance<Config, Item>`                                                                              | Required | Current accepted track.                                                        |
| `displayOptions`     | `readonly string[]`                                                                                                | Required | Part of the settings contract; unused by this section.                         |
| `updateTrack`        | `(update: TrackUpdate<Config, Item>) => TrackMutationResult`                                                       | Required | Validates and commits an individual edit.                                      |
| `updateTracksOfType` | `(createUpdate: (track: ReadonlyTrackInstance<Config, Item>) => TrackUpdate<Config, Item>) => TrackMutationResult` | Required | Atomically updates every track of this exact type, including the active track. |

## Accessibility

Fields have visible labels and validation errors. Dimension actions are named "Apply Height to all tracks of this type" and "Apply Row height to all tracks of this type" where present. Rows stack at narrow widths.

## Notes

See [Settings form layout](formLayout.md) for form composition.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
