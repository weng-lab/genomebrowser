# TrackSettingsTextField

Edit a string with caller-defined validation and optional normalization.

## Usage

```tsx
import {
  TrackSettingsTextField,
  type TrackSettingsTextFieldProps,
} from "@weng-lab/genomebrowser-tracks/shared";

export function FieldExample({ value, onCommit }: TrackSettingsTextFieldProps) {
  return (
    <TrackSettingsTextField
      label="Title"
      value={value}
      validate={(text) => (text.trim() ? undefined : "Enter a title.")}
      onCommit={onCommit}
    />
  );
}
```

## API

`TrackSettingsTextFieldProps` describes the props below. `onCommit` must return the mutation result; return the result of core's `updateTrack` when used in a module settings form.

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

## Commit behavior

Valid changed drafts commit after 300 ms, or immediately on blur or Enter. Escape restores the accepted value. Rejected drafts remain visible with an error. External values replace the local value when no unresolved draft remains.

The component owns its draft, while the caller owns the accepted value. It does not access browser stores directly. `onCommit` returns `TrackMutationResult` from core: success accepts the draft; failure retains it and displays the returned error.

## Accessibility

The visible label names the input; validation errors appear as helper text.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
