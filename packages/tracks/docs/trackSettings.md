# Author track settings

Use the settings controls from `@weng-lab/genomebrowser-tracks/shared` to build MUI settings for a track module. The shared entry does not load any first-party modules. For every prop and verified accessibility behavior, see the [settings component API](trackSettingsApi.md).

## Understand settings ownership

The core browser owns the settings modal. It provides the title, close behavior, position, and width. It renders the active module's `settingsComponent` as the complete form. Settings state is internal to the browser.

Your module chooses and composes all controls, including base options. Reuse `TrackBaseSettings` for title, color, and display. Add `TrackHeightSettings` for fixed height or `TrackRowLayoutSettings` for modules with row-layout config. Do not add another modal, dialog title, close button, or fixed width. Modules without a settings component have no settings button.

The tracks package owns the MUI controls described here. Core remains independent of MUI. Tooltip content follows a separate module contract. See [Author track tooltips](trackTooltips.md).

## Use height terms consistently

Track height is the total vertical space in `base.height`. Row height is the complete slot for one row in `config.rowHeight`. Content height is the part of that slot used for a rectangle, line, label, or other drawing.

Keep margins and gaps inside the row slot by reducing content height. Do not add them to track height. See [Row layout](shared.md#row-layout) for the sizing contract.

## Build a minimal settings component

This example replaces the settings component on the first-party BigWig module. It reads the accepted URL and range from the supplied track. Each field sends an attempted edit through the mutation callback from core.

```tsx
import { type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { bigWigModule, type BigWigConfig } from "@weng-lab/genomebrowser-tracks/bigwig";
import {
  type SignalPoint,
  TrackBaseSettings,
  TrackHeightSettings,
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
  TrackSettingsLayout,
  TrackSettingsRangeFields,
  TrackSettingsSection,
  TrackSettingsUrlField,
} from "@weng-lab/genomebrowser-tracks/shared";

function SignalSettings(props: TrackSettingsProps<BigWigConfig, SignalPoint>) {
  const { track, updateTrack } = props;
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings {...props}>
        <TrackHeightSettings {...props} />
      </TrackBaseSettings>
      <TrackSettingsSection title="Signal source and range">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              disabled={track.source === "host"}
              label="BigWig URL"
              required
              value={track.config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsRangeFields
              mode="independent"
              range={track.config.yRange}
              onCommit={(yRange) => updateTrack({ config: { yRange } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

export const signalModule = {
  ...bigWigModule,
  settingsComponent: SignalSettings,
} satisfies typeof bigWigModule;

export const signalTrack = signalModule.create({
  id: "signal",
  title: "Signal",
  config: { url: "YOUR_URL_HERE" },
});
```

Register `signalModule` and `signalTrack` with the track store. Core supplies `TrackSettingsProps`. The `track` value is a current, shallow read-only view of the complete track. Its `source` is `"user"` by default and can be `"host"` when the embedding application controls the data source. Disable only the data-source controls for host-source tracks, and leave unrelated settings enabled. `updateTrack` is already bound to that track's ID.

Send edits through `updateTrack` as the fields accept them. It accepts optional shallow `base`, `config`, and `interaction` patches in one validated mutation. The full mutation succeeds or fails as a unit. Replace a complete nested object or array when changing one of its values.

`displayOptions` lists the registered module's display names. `updateTracksOfType(createUpdate)` applies a shallow patch to every track with the exact same type, including the active track. The callback receives each current track so it can preserve per-track values. The complete batch is validated before any changes are stored. Both mutation callbacks return validation errors and reject changes while browser interactions are blocked.

```tsx
updateTracksOfType((track) => ({ base: { height: track.base.height + 10 } }));
```

## Compose the form

Start with `TrackSettingsLayout`, then divide controls into `TrackSettingsSection` groups.

- Use `TrackSettingsFieldRow` for a fixed relationship, such as minimum and maximum or a switch and its dependent color. The controls share one row and stack in source order on narrow viewports.
- Use `TrackSettingsFieldGrid` when a variable set of peer controls can flow into available columns.
- Use `TrackSettingsFullRow` inside a grid for a long value such as a source URL. It also works for a nested field row that must stay together.

Keep source order consistent with reading and keyboard order. The [layout component API](trackSettingsApi.md#layout-components) lists exact sizing and breakpoint behavior.

## Return mutation results

The text, number, and range components keep an editable draft separate from accepted config. A valid changed draft commits after 300 ms, or immediately on blur or Enter. Escape restores the last accepted value. The field keeps a rejected draft visible and shows either its local validation error or the error returned by `onCommit`. If config changes elsewhere, the field adopts the new accepted value once it has no unresolved draft.

`onCommit` must return `TrackMutationResult` from `@weng-lab/genomebrowser`. Return `{ ok: true }` for an accepted mutation or `{ ok: false, error: string }` for a rejected one. In a settings component, return the result from `updateTrack` directly as shown above.

URL fields apply a draft only when you activate **Set** beside the input. Typing, waiting, blur, and Enter in the input do not change the active source or request data for the draft. Escape restores the last accepted URL. Validation errors retain the draft. Host-source tracks disable both the input and Set button.

The color field behaves differently. A manually typed hexadecimal value commits only on blur or Enter. Picker changes commit continuously so the track can preview them. Escape cancels a manual draft.

## Label and group controls

Give every field a specific visible label. Use `TrackSettingsSection` when a legend helps explain the relationship between fields. Keep disabled dependent controls visible so the current value and relationship remain clear.

The shared range and color components include their own error associations, keyboard behavior, and focus handling. Do not wrap them in controls that interfere with those behaviors. See [Settings accessibility](trackSettingsApi.md#accessibility) for the verified details.

## First-party settings

First-party modules already include their complete settings panels. Their URL fields are visibly disabled when `track.source` is `"host"`, including modules with several data sources. Track title, display, color, height, and non-source config remain editable. These panels use the controls documented here but are not standalone exports. The `/shared` entry exports `TrackBaseSettings` for shared base fields and all components in the [settings component API](trackSettingsApi.md).
