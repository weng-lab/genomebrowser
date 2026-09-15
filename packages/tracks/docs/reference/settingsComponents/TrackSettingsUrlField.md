# TrackSettingsUrlField

Edit a source URL and apply it explicitly with Set.

## Usage

```tsx
import {
  TrackSettingsUrlField,
  type TrackSettingsUrlFieldProps,
} from "@weng-lab/genomebrowser-tracks/shared";

export function FieldExample({ value, onCommit }: TrackSettingsUrlFieldProps) {
  return <TrackSettingsUrlField label="Source URL" required value={value} onCommit={onCommit} />;
}
```

## API

| Prop          | Type                                   | Default  | Description                                          |
| ------------- | -------------------------------------- | -------- | ---------------------------------------------------- |
| `disabled`    | `boolean`                              | `false`  | Disables editing and commit interactions.            |
| `label`       | `string`                               | `"URL"`  | Visible MUI field label and accessible name.         |
| `onCommit`    | `(url: string) => TrackMutationResult` | Required | Submits the draft URL string when Set is activated.  |
| `placeholder` | `string`                               | None     | Example or hint shown when the draft is empty.       |
| `required`    | `boolean`                              | `false`  | Rejects a blank or whitespace-only URL when enabled. |
| `value`       | `string`                               | Required | Current accepted URL string.                         |

Activate **Set** to apply a changed URL. Typing, blur, and Enter in the input do not commit. Escape cancels the draft.

The component supplies URL input, autocomplete, and virtual-keyboard hints. It does not test data availability. Apart from rejecting a blank required value, it does not validate the URL format.

## Commit behavior

The field keeps its draft locally and takes the accepted value from its props. Return `TrackMutationResult` from `onCommit`, using core's `updateTrack` result in a module form. Success accepts the draft; failure retains it and shows the returned error. The field does not read browser stores.

## Accessibility

The input has a visible label. The Set button is named `Set ${label}` and supports button keyboard activation. `disabled` disables both the input and button.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
