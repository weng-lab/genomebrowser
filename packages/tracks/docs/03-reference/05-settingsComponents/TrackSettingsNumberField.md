# TrackSettingsNumberField

Edit finite numbers while retaining incomplete drafts.

## Usage

```tsx
import {
  TrackSettingsNumberField,
  type TrackSettingsNumberFieldProps,
} from "@weng-lab/genomebrowser-tracks/shared";

export function FieldExample({ value, onCommit }: TrackSettingsNumberFieldProps) {
  return (
    <TrackSettingsNumberField
      label="Height"
      value={value}
      min={20}
      validate={(height) => (height >= 20 ? undefined : "Minimum height is 20.")}
      onCommit={onCommit}
    />
  );
}
```

## API

This component uses a text input so partial numeric drafts such as `-` and `1.` remain editable. It commits only complete finite numbers.

| Prop        | Type                                     | Default     | Description                                                                       |
| ----------- | ---------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `disabled`  | `boolean`                                | `false`     | Disables editing and commit interactions.                                         |
| `inputMode` | `"decimal" \| "numeric"`                 | `"decimal"` | Hints which numeric virtual keyboard to show.                                     |
| `label`     | `string`                                 | Required    | Visible MUI field label and accessible name.                                      |
| `min`       | `number`                                 | None        | Adds minimum-value input metadata. Enforce the limit in `validate` when required. |
| `onCommit`  | `(value: number) => TrackMutationResult` | Required    | Submits a validated finite number.                                                |
| `required`  | `boolean`                                | `false`     | Marks the field required. The field already rejects blank drafts.                 |
| `step`      | `"any" \| number`                        | None        | Adds numeric step input metadata. Enforce step rules in `validate` when required. |
| `validate`  | `(value: number) => string \| undefined` | Required    | Applies domain validation after finite-number parsing.                            |
| `value`     | `number`                                 | Required    | Current accepted value.                                                           |

## Commit behavior

Valid changed drafts commit after 300 ms, or immediately on blur or Enter. Escape restores the accepted value. External values replace the local value when no unresolved draft remains.

The field stores the draft locally. Pass the accepted value through `value` and return `TrackMutationResult` from `onCommit`. In a module form, return core's `updateTrack` result. A successful result accepts the draft. A failed result keeps the draft and displays its error. The field does not read browser stores.

## Accessibility

The visible label names the input; validation errors appear as helper text. Numeric keyboard hints do not change its text-input semantics.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
