# Author track settings

Use the controls from `@weng-lab/genomebrowser-tracks/shared` to build a module's settings form. Core hosts the form in its settings modal. The module supplies all controls, including base fields.

## Build the form

This example replaces BigWig's settings form. `TrackBaseSettings` adds title, color, and display controls, with `TrackHeightSettings` for height. The remaining fields edit the source and Y-axis bounds. Each field returns the result of `updateTrack` so a rejected edit stays visible with its error.

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
  base: {
    id: "signal",
    title: "Signal",
  },
  config: { url: "YOUR_URL_HERE" },
});
```

Register `signalModule` and `signalTrack` with the track store. Core passes `TrackSettingsProps` to the form. `track` is the current, shallow read-only instance, and `updateTrack` is bound to its ID. The example disables URL editing for `source: "host"` while keeping appearance controls available.

## Apply edits

`updateTrack` accepts shallow `base`, `config`, and `interaction` patches. Core validates the entire mutation before applying it. Replace a complete nested object or array when editing one of its values.

Return the resulting `TrackMutationResult` from `onCommit`. `{ ok: true }` accepts the edit. `{ ok: false, code: TrackMutationErrorCode, error: string }` keeps the draft and shows the error. The component manages drafts locally while the caller supplies accepted values.

For edits across tracks, `updateTracksOfType(createUpdate)` calls `createUpdate` with each current track of the same type, including the active track. Return a patch based on that track to preserve its other values. Core validates the whole batch before storing any changes. Both mutation callbacks reject edits while browser interactions are blocked. `displayOptions` lists the registered module's display names.

## Choose controls and layout

Start with `TrackSettingsLayout` and group related controls under `TrackSettingsSection`. Use `TrackBaseSettings` for common base fields. For modules with `config.rowHeight`, add `TrackRowLayoutSettings` in place of `TrackHeightSettings` to coordinate total height and row height.

Track height is the total space in `base.height`. Each row occupies `config.rowHeight`, including its internal margins and gaps. Reduce the drawn content height to make room for those gaps. See [Row layout](../reference/coordinatesAndLayout/rowLayout.md) for the calculation.

Use `TrackSettingsFieldRow` for controls that belong together, such as two range bounds or a switch and its color. Use `TrackSettingsFieldGrid` when controls can flow into available columns, and `TrackSettingsFullRow` for a URL or nested row that must span the grid. The [layout reference](../reference/settingsComponents/formLayout.md) gives spacing and responsive behavior.

## Drafts and commit timing

Text, number, and range fields commit a valid changed draft after 300 ms, or immediately on blur or Enter. Escape restores the last accepted value. Invalid or rejected drafts stay visible with their errors. An external value replaces the local value once no unresolved draft remains.

URL fields commit only when **Set** is activated. Typing, waiting, blur, and Enter do not change the source or request data. Escape restores the accepted URL. For host-owned sources, disable both the input and Set button through the field's `disabled` prop.

Color text commits on blur or Enter. Picker changes commit during interaction for a live preview. Escape cancels a manual text draft. The [field references](../reference/settingsComponents/README.md) specify validation and callbacks for each control.

## Labels and browser hosting

Give every field a visible label. Use a section legend to explain a group, and preserve reading order in the component tree. Keep disabled dependent controls visible so users can see their current values. Shared controls provide error associations and keyboard behavior described in their references.

Core supplies the modal's title, close control, position, and width. Do not add a second dialog or fixed width to the form. The modal is 550 pixels wide, with total height capped at its width and constrained by the viewport. Short forms use their natural height; longer forms scroll beneath the header. Core resets field drafts when switching tracks. A module without `settingsComponent` has no settings button.

First-party modules already provide complete forms. Their URL fields are disabled for host-owned tracks, while appearance fields remain editable. The forms are not standalone exports; reuse the controls from `/shared` when building a different form. Tooltip content is separate and uses [TrackTooltip](../reference/tooltips/TrackTooltip.md).

Return to [Guides and release history](README.md) or [Tracks documentation](../README.md).
