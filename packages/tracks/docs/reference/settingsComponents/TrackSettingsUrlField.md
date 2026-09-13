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

`TrackSettingsUrlFieldProps` describes the props below. `onCommit` must return the mutation result; return the result of core's `updateTrack` when used in a module settings form.

| Prop          | Type                                   | Default  | Description                                                     |
| ------------- | -------------------------------------- | -------- | --------------------------------------------------------------- |
| `disabled`    | `boolean`                              | `false`  | Visibly disables editing and commit interactions.               |
| `label`       | `string`                               | `"URL"`  | Visible MUI field label and accessible name.                    |
| `onCommit`    | `(url: string) => TrackMutationResult` | Required | Attempts to persist the draft URL string when Set is activated. |
| `placeholder` | `string`                               | None     | Example or hint shown when the draft is empty.                  |
| `required`    | `boolean`                              | `false`  | Rejects a blank or whitespace-only URL when enabled.            |
| `value`       | `string`                               | Required | Current accepted URL string.                                    |

Activate **Set** to apply a changed URL. Typing, blur, and Enter in the input do not commit. Escape cancels the draft. The Set button has the accessible name `Set ${label}` and supports standard button keyboard activation. `disabled` disables both controls.

The component supplies URL input, autocomplete, and virtual-keyboard hints. It does not test data availability. Apart from rejecting a blank required value, it does not validate the URL format.

## Commit behavior

The component owns its draft, while the caller owns the accepted value. It does not access browser stores directly. `onCommit` returns `TrackMutationResult` from core: success accepts the draft; failure retains it and displays the returned error.

## Accessibility

The input has a visible label. The Set button is named `Set ${label}` and supports button keyboard activation. Disabled controls cannot be edited.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
