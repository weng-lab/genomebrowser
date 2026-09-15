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

| Prop       | Type                                     | Default  | Description                                                    |
| ---------- | ---------------------------------------- | -------- | -------------------------------------------------------------- |
| `label`    | `string`                                 | Required | Visible field label and the basis for picker accessible names. |
| `value`    | `string`                                 | Required | Current six-digit hexadecimal color.                           |
| `disabled` | `boolean`                                | `false`  | Disables the text field, picker, and commits.                  |
| `onCommit` | `(color: string) => TrackMutationResult` | Required | Submits a normalized `#RRGGBB` color.                          |

Manual entries must use six-digit hexadecimal `#RRGGBB` form. The component normalizes them to uppercase. The field is required and has no clear action or fallback state.

The visual picker provides a saturation and brightness area plus a hue slider.

## Commit behavior

Manual text commits on blur or Enter; Escape cancels its draft. Picker changes preview live through pointer or keyboard interaction. The component groups rapid updates into animation frames and commits the final color when the interaction ends.

The field keeps its draft locally and takes the accepted value from its props. Return `TrackMutationResult` from `onCommit`, using core's `updateTrack` result in a module form. Success accepts the draft; failure retains it and shows the returned error. The field does not read browser stores.

## Accessibility

The labeled text field supports keyboard entry. The swatch opens a labeled picker with keyboard-operable color and hue sliders. Opening moves focus into the popover; closing restores focus to the swatch.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
