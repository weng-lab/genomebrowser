# Track settings

Supply `settingsComponent` when a module needs an editable settings form. Core mounts the form in its settings dialog and supplies validated callbacks for changing tracks.

## Usage

This form edits the track title through the callback provided by the browser:

```tsx
import { useState } from "react";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";

type Config = { url: string };

export function SignalSettings({ track, updateTrack }: TrackSettingsProps<Config>) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <label>
        Track title
        <input
          value={track.base.title}
          onChange={(event) => {
            const result = updateTrack({ base: { title: event.target.value } });
            setError(result.ok ? null : result.error);
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

Set `settingsComponent: SignalSettings` in a module whose parsed config matches `Config`. This example commits each valid edit immediately; an empty title is rejected and the existing title remains. Add controls for other base and config fields as needed.

## Settings

`TrackSettingsComponent<Config, InteractionItem>` is a React component accepting `TrackSettingsProps<Config, InteractionItem>`:

| Prop                 | Type                                                                                                                     | Default  | Description                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `track`              | `ReadonlyTrackInstance<Config, InteractionItem>`                                                                         | Required | The track instance with its current settings and callbacks.                                                                      |
| `displayOptions`     | `readonly string[]`                                                                                                      | Required | Registered renderer names.                                                                                                       |
| `updateTrack`        | `(update: TrackUpdate<Config, InteractionItem> \| TrackUpdater<Config, InteractionItem>) => TrackSettingsMutationResult` | Required | Applies a shallow patch, or the patch an updater returns for the latest stored track, to this instance. Its ID is already bound. |
| `updateTracksOfType` | `(createUpdate: TrackUpdater<Config, InteractionItem>) => TrackSettingsMutationResult`                                   | Required | Computes patches for every current same-type track, validates the resulting batch, and commits it atomically.                    |

The module supplies the complete form, including base controls. The browser opens the form in a dialog. Check mutation results to explain rejected edits in the form. Keep batch-update callbacks free of side effects because validation can reject the batch.

Every track has a settings button. The download section uses MUI buttons and an unchecked **Include ruler** checkbox; the checkbox requires a displayed ruler. The shared dialog supplies SVG and PNG [image downloads](../01-browserSetup/useTrackDownload.md), even when the module has no `settingsComponent`. Use native form elements to group custom controls, or the reusable MUI settings controls supplied by the tracks package.

## Mutation behavior

Both callbacks return `TrackSettingsMutationResult`, which is a [TrackMutationResult](../01-browserSetup/trackStore.md#mutation-results) or an `INTERACTION_BLOCKED` failure. Successful changes commit synchronously and do not wait for fetching or rendering. `updateTrack` calls the store's [`updateTrack`](../01-browserSetup/trackStore.md#updating-a-track) and uses its shallow patch rules.

Pass an updater to `updateTrack` when a patch builds on the current config, such as one field of a nested object. Two fields can commit in the same event before the form re-renders, so the `track` prop can be one edit behind. An updater receives the latest stored track instead:

```tsx
onCommit={(forward) =>
  updateTrack((current) => ({
    config: { strandColors: { ...current.config.strandColors, forward } },
  }))
}
```

`updateTracksOfType` calls the store's [`updateTracks`](../01-browserSetup/trackStore.md#updatetracks) for every track of this module's type. It validates every updated instance, and a rejected batch leaves all tracks unchanged.

Unexpected exceptions from a patch callback or custom schema code propagate.

The browser supplies every prop in the table. `InteractionItem` defaults to `unknown`. Use `track.source` when your form needs to distinguish host-owned sources from user-editable sources; core does not identify or protect source config fields. Hosted controls sit inside a disabled fieldset while browser interactions are blocked. The callbacks also return `INTERACTION_BLOCKED` during that period, and the store does not change.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
