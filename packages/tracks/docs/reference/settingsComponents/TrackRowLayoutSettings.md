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

The generic `Config` must extend `RowLayoutConfig`. Height edits derive row height; row-height edits derive total height. Each update commits both values together and preserves the nearest whole row count, with at least one row. Apply to all preserves each matching track's own row count. Row height must be at least 1; minimum total height is the current row count in pixels. Rejected edits retain their draft and show the mutation error. These components consume core's `TrackSettingsProps<Config, Item>`; they do not export separate props aliases.

| Prop                 | Type                                                                                                               | Default  | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| `track`              | `ReadonlyTrackInstance<Config, Item>`                                                                              | Required | Current accepted track.                                                        |
| `displayOptions`     | `readonly string[]`                                                                                                | Required | Part of the settings contract; unused by this section.                         |
| `updateTrack`        | `(update: TrackUpdate<Config, Item>) => TrackMutationResult`                                                       | Required | Validates and commits an individual edit.                                      |
| `updateTracksOfType` | `(createUpdate: (track: ReadonlyTrackInstance<Config, Item>) => TrackUpdate<Config, Item>) => TrackMutationResult` | Required | Atomically updates every track of this exact type, including the active track. |

## Accessibility

Fields have visible labels and validation errors. Dimension actions are named “Apply Height to all tracks of this type” and “Apply Row height to all tracks of this type” where present. Rows stack at narrow widths.

## Notes

Pass current props and return the supplied mutation results. The browser owns the shell and resets field drafts when switching tracks. See [settings authoring](../../legacy/trackSettings.md) for composition and draft behavior.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
