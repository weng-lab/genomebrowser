# TrackBaseSettings

Compose shared title, color, and display controls in a module settings form.

## Usage

```tsx
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import type { BigWigConfig } from "@weng-lab/genomebrowser-tracks/bigwig";
import {
  TrackBaseSettings,
  TrackHeightSettings,
  type SignalPoint,
} from "@weng-lab/genomebrowser-tracks/shared";

function SignalSettings(props: TrackSettingsProps<BigWigConfig, SignalPoint>) {
  return (
    <TrackBaseSettings {...props}>
      <TrackHeightSettings {...props} />
    </TrackBaseSettings>
  );
}
```

## API

`TrackBaseSettingsProps` contains the props below. The component reads them without accessing a store.

Title cannot be blank. Display selection appears when there is more than one option and commits immediately, showing returned errors. Title and color use the commit behavior of [TrackSettingsTextField](TrackSettingsTextField.md#commit-behavior) and [TrackSettingsColorField](TrackSettingsColorField.md#commit-behavior).

| Prop             | Type                                                         | Default  | Description                                          |
| ---------------- | ------------------------------------------------------------ | -------- | ---------------------------------------------------- |
| `track`          | `{ base: Readonly<TrackBase> }`                              | Required | Current accepted base options.                       |
| `displayOptions` | `readonly string[]`                                          | Required | Registered display modes.                            |
| `updateTrack`    | `(update: { base: TrackBaseUpdate }) => TrackMutationResult` | Required | Submits a base patch and returns validation results. |
| `children`       | `ReactNode`                                                  | None     | Additional controls, such as dimension settings.     |

## Accessibility

Fields have visible labels and validation errors. The section uses a fieldset and legend. Rows stack at narrow widths.

## Notes

See [Settings form layout](formLayout.md) for form composition.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
