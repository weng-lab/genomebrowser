# Settings component API

This page lists the public settings components exported from `@weng-lab/genomebrowser-tracks/shared`. Read [Author track settings](trackSettings.md) first for ownership, composition, and update patterns.

All `onCommit` callbacks return `TrackMutationResult` from `@weng-lab/genomebrowser`.

## `TrackBaseSettings`

`TrackBaseSettings` takes no props. It reads the active track from the browser stores and renders shared title, color, display, and height controls. It submits validated patches through the track store. Failed mutations remain visible without replacing accepted values. The action beside each dimension field applies the valid displayed value to every track with the exact same type, including the active track.

The display control appears only when the active module has at least two display modes. Title cannot be blank. A track without valid row-layout config has one Height field with a 20-pixel minimum.

When config contains a finite `rowHeight` of at least 1, the component shows adjacent Height and Row height fields. Track height is the total vertical space. Row height is the complete slot for one row. Either edit preserves the row count derived from the current values, then submits `base.height` and `config.rowHeight` in one update. Applying Row height to the type recalculates each matching track's total height from its own current row count. See [Row layout](shared.md#row-layout).

## Layout components

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

## Field components

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
| `disabled`    | `boolean`                              | `false`  | Visibly disables editing and commit interactions.    |
| `label`       | `string`                               | `"URL"`  | Visible MUI field label and accessible name.         |
| `onCommit`    | `(url: string) => TrackMutationResult` | Required | Attempts to persist the draft URL string.            |
| `placeholder` | `string`                               | None     | Example or hint shown when the draft is empty.       |
| `required`    | `boolean`                              | `false`  | Rejects a blank or whitespace-only URL when enabled. |
| `value`       | `string`                               | Required | Current accepted URL string.                         |

The component supplies URL input, autocomplete, and virtual-keyboard hints. It does not test data availability. Apart from rejecting a blank required value, it does not validate the URL format.

### `TrackSettingsRangeFields`

The range is optional in both modes. Selecting **Use automatic range** commits `undefined`.

| Prop           | Type     | Default     | Description                                       |
| -------------- | -------- | ----------- | ------------------------------------------------- |
| `minimumLabel` | `string` | `"Minimum"` | Visible label for the lower bound in either mode. |
| `maximumLabel` | `string` | `"Maximum"` | Visible label for the upper bound in either mode. |

#### Complete mode

| Prop       | Type                                                                        | Default      | Description                                                              |
| ---------- | --------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `mode`     | `"complete"`                                                                | `"complete"` | Requires both bounds together. Both blank values select automatic range. |
| `range`    | `{ min: number; max: number } \| undefined`                                 | Required     | Current accepted complete range.                                         |
| `onCommit` | `(range: { min: number; max: number } \| undefined) => TrackMutationResult` | Required     | Attempts to persist a complete range or automatic range.                 |

#### Independent mode

| Prop       | Type                                                                          | Default  | Description                                                      |
| ---------- | ----------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `mode`     | `"independent"`                                                               | Required | Allows either bound to be omitted independently.                 |
| `range`    | `{ min?: number; max?: number } \| undefined`                                 | Required | Current accepted override. `min`, `max`, or both may be present. |
| `onCommit` | `(range: { min?: number; max?: number } \| undefined) => TrackMutationResult` | Required | Attempts to persist independent overrides or automatic range.    |

Every entered bound must be finite. When both are present, minimum must be less than maximum. Complete mode reports an error until both bounds are present. Independent mode can commit either bound alone.

### `TrackSettingsColorField`

| Prop       | Type                                     | Default  | Description                                                    |
| ---------- | ---------------------------------------- | -------- | -------------------------------------------------------------- |
| `label`    | `string`                                 | Required | Visible field label and the basis for picker accessible names. |
| `value`    | `string`                                 | Required | Current concrete six-digit hexadecimal color.                  |
| `disabled` | `boolean`                                | `false`  | Disables the text field, picker, and commits.                  |
| `onCommit` | `(color: string) => TrackMutationResult` | Required | Attempts to persist a normalized `#RRGGBB` color.              |

Manual entries must use six-digit hexadecimal `#RRGGBB` form. The component normalizes them to uppercase. The field is required and has no clear action or fallback state.

The visual picker provides a saturation and brightness area plus a hue slider. Pointer and keyboard changes preview live. The component groups rapid updates into animation frames and commits the final color when the interaction ends.

## Accessibility

Core supplies the modal heading, close action, dragging behavior, and modal Escape handling. Every settings field has a visible label. Layout components preserve source order when rows stack.

Range validation is associated with both bound inputs while rendering one shared error message. Read-only text and URL fields retain their visible labels, focus, and selectable values. Color fields expose the hexadecimal text and a swatch. The picker exposes keyboard-operable color and hue sliders inside a labeled group. Opening it moves focus into the popover. Closing it restores focus to the swatch button. Disabled dependent controls remain visible but inoperable.

Return to [Author track settings](trackSettings.md) for composition and update guidance.
