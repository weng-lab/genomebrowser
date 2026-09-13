# TrackSettingsColorField

Edit a six-digit hexadecimal color with text input or a visual picker.

## Usage

```tsx
import {
  TrackSettingsColorField,
  type TrackSettingsColorFieldProps,
} from "@weng-lab/genomebrowser-tracks/shared";

export function FieldExample({ value, onCommit }: TrackSettingsColorFieldProps) {
  return <TrackSettingsColorField label="Signal color" value={value} onCommit={onCommit} />;
}
```

## API

`TrackSettingsColorFieldProps` describes the props below. `onCommit` must return the mutation result; return the result of core's `updateTrack` when used in a module settings form.

| Prop       | Type                                     | Default  | Description                                                    |
| ---------- | ---------------------------------------- | -------- | -------------------------------------------------------------- |
| `label`    | `string`                                 | Required | Visible field label and the basis for picker accessible names. |
| `value`    | `string`                                 | Required | Current concrete six-digit hexadecimal color.                  |
| `disabled` | `boolean`                                | `false`  | Disables the text field, picker, and commits.                  |
| `onCommit` | `(color: string) => TrackMutationResult` | Required | Attempts to persist a normalized `#RRGGBB` color.              |

Manual entries must use six-digit hexadecimal `#RRGGBB` form. The component normalizes them to uppercase. The field is required and has no clear action or fallback state.

The visual picker provides a saturation and brightness area plus a hue slider. Pointer and keyboard changes preview live. The component groups rapid updates into animation frames and commits the final color when the interaction ends.

## Commit behavior

Manual text commits on blur or Enter; Escape cancels its draft. Picker changes commit during interaction for live preview. Rejected mutations display their errors.

The component owns its draft, while the caller owns the accepted value. It does not access browser stores directly. `onCommit` returns `TrackMutationResult` from core: success accepts the draft; failure retains it and displays the returned error.

## Accessibility

The labeled text field supports keyboard entry. The swatch opens a labeled picker with keyboard-operable color and hue sliders. Opening moves focus into the popover; closing restores focus to the swatch.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
