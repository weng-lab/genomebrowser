# Author track settings

Use the track-settings authoring components from `@weng-lab/genomebrowser-ui` to build compact, consistent MUI controls for a track module. They compose with the public module and mutation types from `@weng-lab/genomebrowser`.

## Ownership

The core browser owns the settings modal shell: its title, close behavior, position, and width. It renders the configured base-settings component and then the active module's `settingsComponent`. A module settings component should therefore render only controls for that module's track-specific configuration. Do not add another modal, title, close button, or fixed width.

The UI package owns the MUI authoring controls on this page. Core remains independent of MUI. `TrackBaseSettings` is the optional UI implementation for shared title, color, display, and height controls; track-specific components should not repeat those fields. Tooltip content has separate module ownership and authoring conventions; see [Author track tooltips](trackTooltips.md).

## Minimal settings component

This example replaces the settings component on the core BigWig module. Each field selects its validated value from the active track and returns every update through the mutation callback supplied by core.

```tsx
import {
  bigWigModule,
  useSettingsStore,
  useTrackStore,
  type BigWigConfig,
} from "@weng-lab/genomebrowser";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
  TrackSettingsLayout,
  TrackSettingsRangeFields,
  TrackSettingsSection,
  TrackSettingsUrlField,
} from "@weng-lab/genomebrowser-ui";

function SignalSettings() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const url = useTrackStore((state) => (state.getTrack(trackId)?.config as BigWigConfig).url);
  const rangeMin = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig).yRange?.min,
  );
  const rangeMax = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig).yRange?.max,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const range =
    rangeMin === undefined && rangeMax === undefined ? undefined : { min: rangeMin, max: rangeMax };

  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="Signal source and range">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              label="BigWig URL"
              required
              value={url}
              onCommit={(url) => updateTrack(trackId, { config: { url } })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsRangeFields
              mode="independent"
              range={range}
              onCommit={(yRange) => updateTrack(trackId, { config: { yRange } })}
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

Register `signalModule` and `signalTrack` with the track store in the same way as any core module and track. Read the active ID with `useSettingsStore`, then use `useTrackStore` to subscribe each field to a primitive or stable leaf rather than a complete config object. Call `updateTrack(trackId, update)` with optional shallow `base` and `config` patches for a validated, all-or-nothing mutation. When updating one field inside a nested object or array, use `useTrackStoreApi().getState()` inside the commit handler to preserve the latest sibling values without subscribing the field to the full object.

## `TrackBaseSettings` API

`TrackBaseSettings` renders the shared title, color, display, and height controls. It takes no props; each field reads the active ID and value from the browser stores and submits `base` patches through the track store. Failed mutations remain visible without replacing accepted values. The display control is omitted when the active module has fewer than two display modes.

The title, color, display, and height controls have visible labels. Color uses the accessible picker behavior documented below. Height must be at least 20 in this UI, and title cannot be blank.

## Compose the layout

- `TrackSettingsLayout` is the root for a module settings component. It puts one 12 px gap between its top-level children, normally sections.
- `TrackSettingsSection` groups related controls in a bordered `fieldset` with a visible legend.
- `TrackSettingsFieldRow` keeps a fixed set of peer controls on one row. At viewport widths of 566 px or less, it stacks them at full width in source order.
- `TrackSettingsFieldGrid` lets peer controls flow into as many usable columns as fit. Each column is at least 12 rem unless the available width is smaller.
- `TrackSettingsFullRow` makes one grid item span every column. Use it for long values such as source URLs or for a nested fixed row that must stay together.

Use a field row when the controls have a fixed relationship, such as minimum and maximum or a switch and its dependent color. Use a field grid when a variable set of peer controls can flow freely. Keep source order consistent with reading and keyboard order.

## Commit and validation behavior

The text, number, URL, and range components keep an editable draft separate from the accepted configuration. A valid changed draft commits after 300 ms, or immediately on blur or Enter. Escape restores the last accepted value. Local validation failures and errors returned by `onCommit` remain visible without discarding the draft or changing track configuration. An external accepted value updates a field when it has no unresolved draft.

`onCommit` must return the core `TrackMutationResult` union: `{ ok: true }` for an accepted mutation or `{ ok: false, error: string }` for a rejected mutation. Return the result from `updateTrack` directly, as in the example.

The color field is deliberately different. Manual hexadecimal drafts commit only on blur or Enter; picker changes commit continuously for preview. Escape cancels a manual draft.

## Layout component API

### `TrackSettingsLayout`

| Prop       | Type        | Default  | Description                                                         |
| ---------- | ----------- | -------- | ------------------------------------------------------------------- |
| `children` | `ReactNode` | Required | Top-level settings content. Direct children are separated by 12 px. |

### `TrackSettingsSection`

| Prop       | Type        | Default  | Description                                           |
| ---------- | ----------- | -------- | ----------------------------------------------------- |
| `title`    | `string`    | Required | Visible section legend.                               |
| `children` | `ReactNode` | Required | Controls or layout primitives grouped by the section. |

### `TrackSettingsFieldRow`

| Prop       | Type        | Default  | Description                                                                                             |
| ---------- | ----------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `children` | `ReactNode` | Required | Fixed peer controls. They share the available row width and stack at viewport widths of 566 px or less. |

### `TrackSettingsFieldGrid`

| Prop       | Type        | Default  | Description                                                                   |
| ---------- | ----------- | -------- | ----------------------------------------------------------------------------- |
| `children` | `ReactNode` | Required | Controls that flow into auto-fitting columns with a 12 rem preferred minimum. |

### `TrackSettingsFullRow`

| Prop       | Type        | Default  | Description                                                                  |
| ---------- | ----------- | -------- | ---------------------------------------------------------------------------- |
| `children` | `ReactNode` | Required | Content that spans all columns when used as a `TrackSettingsFieldGrid` item. |

## Field component API

All field callbacks below return `TrackMutationResult` from `@weng-lab/genomebrowser`.

### `TrackSettingsTextField`

| Prop           | Type                                              | Default         | Description                                                                   |
| -------------- | ------------------------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| `autoComplete` | `string`                                          | Browser default | Sets the input's autocomplete hint.                                           |
| `disabled`     | `boolean`                                         | `false`         | Disables editing and commit interactions.                                     |
| `inputMode`    | `"email" \| "search" \| "tel" \| "text" \| "url"` | Browser default | Hints which virtual keyboard to show.                                         |
| `label`        | `string`                                          | Required        | Visible MUI field label and accessible name.                                  |
| `normalize`    | `(value: string) => string`                       | Identity        | Transforms a locally valid draft before comparison and commit.                |
| `onCommit`     | `(value: string) => TrackMutationResult`          | Required        | Attempts to persist a validated, normalized value.                            |
| `placeholder`  | `string`                                          | None            | Example or hint shown when the draft is empty. It does not replace the label. |
| `required`     | `boolean`                                         | `false`         | Marks the field required. Validation remains controlled by `validate`.        |
| `type`         | `"text" \| "url"`                                 | `"text"`        | Sets the native input type.                                                   |
| `validate`     | `(value: string) => string \| undefined`          | Required        | Returns an error for an invalid raw draft or `undefined` when it may commit.  |
| `value`        | `string`                                          | Required        | Current accepted value.                                                       |

### `TrackSettingsNumberField`

This component uses a text input so partial numeric drafts such as `-` and `1.` remain editable. It commits only complete finite numbers.

| Prop        | Type                                     | Default     | Description                                                                       |
| ----------- | ---------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `disabled`  | `boolean`                                | `false`     | Disables editing and commit interactions.                                         |
| `inputMode` | `"decimal" \| "numeric"`                 | `"decimal"` | Hints which numeric virtual keyboard to show.                                     |
| `label`     | `string`                                 | Required    | Visible MUI field label and accessible name.                                      |
| `min`       | `number`                                 | None        | Adds minimum-value input metadata. Enforce the limit in `validate` when required. |
| `onCommit`  | `(value: number) => TrackMutationResult` | Required    | Attempts to persist a validated finite number.                                    |
| `required`  | `boolean`                                | `false`     | Marks the field required. The field already rejects blank drafts.                 |
| `step`      | `"any" \| number`                        | None        | Adds numeric step input metadata. Enforce step rules in `validate` when required. |
| `validate`  | `(value: number) => string \| undefined` | Required    | Applies domain validation after finite-number parsing.                            |
| `value`     | `number`                                 | Required    | Current accepted value.                                                           |

### `TrackSettingsUrlField`

| Prop          | Type                                   | Default  | Description                                          |
| ------------- | -------------------------------------- | -------- | ---------------------------------------------------- |
| `label`       | `string`                               | `"URL"`  | Visible MUI field label and accessible name.         |
| `onCommit`    | `(url: string) => TrackMutationResult` | Required | Attempts to persist the draft URL string.            |
| `placeholder` | `string`                               | None     | Example or hint shown when the draft is empty.       |
| `required`    | `boolean`                              | `false`  | Rejects a blank or whitespace-only URL when enabled. |
| `value`       | `string`                               | Required | Current accepted URL string.                         |

The component supplies URL input, autocomplete, and virtual-keyboard hints. It does not test data availability or impose URL-format validation beyond rejecting a blank required value.

### `TrackSettingsRangeFields`

The range is optional in both modes. **Use automatic range** commits `undefined`.

| Prop           | Type     | Default     | Description                                       |
| -------------- | -------- | ----------- | ------------------------------------------------- |
| `minimumLabel` | `string` | `"Minimum"` | Visible label for the lower bound in either mode. |
| `maximumLabel` | `string` | `"Maximum"` | Visible label for the upper bound in either mode. |

#### Complete mode

| Prop       | Type                                                  | Default      | Description                                                                 |
| ---------- | ----------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `mode`     | `"complete"`                                          | `"complete"` | Requires both bounds together. Both blank values select automatic range.    |
| `range`    | `YRange \| undefined`                                 | Required     | Current accepted complete range. `YRange` contains numeric `min` and `max`. |
| `onCommit` | `(range: YRange \| undefined) => TrackMutationResult` | Required     | Attempts to persist a complete range or automatic range.                    |

#### Independent mode

| Prop       | Type                                                          | Default  | Description                                                      |
| ---------- | ------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `mode`     | `"independent"`                                               | Required | Allows either bound to be omitted independently.                 |
| `range`    | `YRangeOverride \| undefined`                                 | Required | Current accepted override; `min`, `max`, or both may be present. |
| `onCommit` | `(range: YRangeOverride \| undefined) => TrackMutationResult` | Required | Attempts to persist independent overrides or automatic range.    |

Every entered bound must be finite. When both are present, minimum must be less than maximum. Complete mode reports an error until both bounds are present; independent mode can commit either bound alone.

### `TrackSettingsColorField`

| Prop       | Type                                     | Default  | Description                                                    |
| ---------- | ---------------------------------------- | -------- | -------------------------------------------------------------- |
| `label`    | `string`                                 | Required | Visible field label and the basis for picker accessible names. |
| `value`    | `string`                                 | Required | Current concrete six-digit hexadecimal color.                  |
| `disabled` | `boolean`                                | `false`  | Disables the text field, picker, and commits.                  |
| `onCommit` | `(color: string) => TrackMutationResult` | Required | Attempts to persist a normalized `#RRGGBB` color.              |

Manual entries must use six-digit hexadecimal `#RRGGBB` form and are normalized to uppercase. The field is required and has no clear action or fallback state. The visual picker provides a saturation and brightness surface plus a hue slider. Pointer and keyboard changes preview live, with rapid updates coalesced to animation frames and the final color committed when the interaction ends.

## Accessibility

Core supplies the modal heading, close action, dragging behavior, and modal Escape handling. Give every field a specific visible label. Layout primitives preserve source order when rows stack.

Range validation is associated with both bound inputs while rendering one shared error message. Color fields expose the hexadecimal text as well as the swatch. The picker exposes keyboard-operable color and hue sliders inside a labeled group. Opening it moves focus into the popover, and closing it restores focus to the swatch button. Disabled dependent controls remain visible but inoperable.

## Built-in settings components

The UI package also exports `BigWigSettings`, `BigBedSettings`, `BulkBedSettings`, `CaveSettings`, `MethylCSettings`, and `TranscriptSettings` for the matching core modules. Assign one to the matching module's `settingsComponent` when its built-in controls fit your application. The same package exports `TrackBaseSettings`. These ready-made settings components use the authoring primitives and follow the behavior documented above; custom module settings do not need to depend on them. Matching tooltip components are documented separately in [Author track tooltips](trackTooltips.md).
