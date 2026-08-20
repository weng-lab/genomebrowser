# Author track settings

Use the settings controls from `@weng-lab/genomebrowser-tracks/shared` to build MUI settings for a track module. The shared entry does not load any first-party modules. For every prop and verified accessibility behavior, see the [settings component API](trackSettingsApi.md).

## Understand settings ownership

The core browser owns the settings modal. It provides the title, close behavior, position, and width. It renders the configured base-settings component, followed by the active module's `settingsComponent`.

Your module component should render only controls for module-specific config. Do not add another modal, title, close button, or fixed width. Do not repeat the shared title, color, display, or height fields supplied by `TrackBaseSettings`.

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
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
  TrackSettingsLayout,
  TrackSettingsRangeFields,
  TrackSettingsSection,
  TrackSettingsUrlField,
} from "@weng-lab/genomebrowser-tracks/shared";

function SignalSettings({ track, updateTrack }: TrackSettingsProps<BigWigConfig, SignalPoint>) {
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="Signal source and range">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
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

Register `signalModule` and `signalTrack` with the track store. Core supplies `TrackSettingsProps`. The `track` value is a current, shallow read-only view of the complete track. `updateTrack` is already bound to that track's ID.

Send edits through `updateTrack` as the fields accept them. It accepts optional shallow `base`, `config`, and `interaction` patches in one validated mutation. The full mutation succeeds or fails as a unit. Replace a complete nested object or array when changing one of its values.

## Compose the form

Start with `TrackSettingsLayout`, then divide controls into `TrackSettingsSection` groups.

- Use `TrackSettingsFieldRow` for a fixed relationship, such as minimum and maximum or a switch and its dependent color. The controls share one row and stack in source order on narrow viewports.
- Use `TrackSettingsFieldGrid` when a variable set of peer controls can flow into available columns.
- Use `TrackSettingsFullRow` inside a grid for a long value such as a source URL. It also works for a nested field row that must stay together.

Keep source order consistent with reading and keyboard order. The [layout component API](trackSettingsApi.md#layout-components) lists exact sizing and breakpoint behavior.

## Return mutation results

The text, number, URL, and range components keep an editable draft separate from accepted config. A valid changed draft commits after 300 ms, or immediately on blur or Enter. Escape restores the last accepted value. The field keeps a rejected draft visible and shows either its local validation error or the error returned by `onCommit`. If config changes elsewhere, the field adopts the new accepted value once it has no unresolved draft.

`onCommit` must return `TrackMutationResult` from `@weng-lab/genomebrowser`. Return `{ ok: true }` for an accepted mutation or `{ ok: false, error: string }` for a rejected one. In a settings component, return the result from `updateTrack` directly as shown above.

The color field behaves differently. A manually typed hexadecimal value commits only on blur or Enter. Picker changes commit continuously so the track can preview them. Escape cancels a manual draft.

## Label and group controls

Give every field a specific visible label. Use `TrackSettingsSection` when a legend helps explain the relationship between fields. Keep disabled dependent controls visible so the current value and relationship remain clear.

The shared range and color components include their own error associations, keyboard behavior, and focus handling. Do not wrap them in controls that interfere with those behaviors. See [Settings accessibility](trackSettingsApi.md#accessibility) for the verified details.

## First-party settings

First-party modules already include their track-specific settings panels. Those panels use the controls documented here but are not standalone exports. The `/shared` entry exports `TrackBaseSettings` for shared base fields and all components in the [settings component API](trackSettingsApi.md).
