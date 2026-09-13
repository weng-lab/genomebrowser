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

| Prop                 | Type                                                                                                                                     | Default  | Description                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `track`              | `ReadonlyTrackInstance<Config, InteractionItem>`                                                                                         | Required | Current complete instance.                                                                                    |
| `displayOptions`     | `readonly string[]`                                                                                                                      | Required | Registered renderer names.                                                                                    |
| `updateTrack`        | `(update: TrackUpdate<Config, InteractionItem>) => TrackMutationResult`                                                                  | Required | Applies a shallow patch to this instance. Its ID is already bound.                                            |
| `updateTracksOfType` | `(createUpdate: (track: ReadonlyTrackInstance<Config, InteractionItem>) => TrackUpdate<Config, InteractionItem>) => TrackMutationResult` | Required | Computes patches for every current same-type track, validates the resulting batch, and commits it atomically. |

The module supplies the complete form, including base controls. The browser supplies the modal shell and rejects these update callbacks while interactions are blocked. Inspect mutation results so rejected edits can be explained to the user. Keep batch-update callbacks free of side effects because validation can reject the batch.

A module without `settingsComponent` has no settings button. Use native form elements to group custom controls, or the reusable MUI settings controls supplied by the tracks package.

## Mutation behavior

Both callbacks return [TrackMutationResult](../browserSetup/trackStore.md#mutation-results). Successful changes commit synchronously and do not wait for fetching or rendering. `updateTrack` uses the store's [shallow patch rules](../browserSetup/trackStore.md#trackupdate-and-trackbaseupdate). `updateTracksOfType` computes one patch for each same-type instance and validates the entire replacement list, including unchanged instances of other types. A rejected batch leaves all tracks unchanged. Unexpected exceptions from a patch callback or custom schema code propagate.

The browser supplies every prop in the table. `InteractionItem` defaults to `unknown`. Use `track.source` when your form needs to distinguish host-owned sources from user-editable sources; core does not identify or protect source config fields for you. Hosted controls sit inside a disabled fieldset while browser interactions are blocked. The callbacks also return `INTERACTION_BLOCKED` during that period.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
