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

| Prop             | Type                                                         | Default  | Description                                          |
| ---------------- | ------------------------------------------------------------ | -------- | ---------------------------------------------------- |
| `track`          | `{ base: Readonly<TrackBase> }`                              | Required | Current accepted base options.                       |
| `displayOptions` | `readonly string[]`                                          | Required | Registered display modes.                            |
| `updateTrack`    | `(update: { base: TrackBaseUpdate }) => TrackMutationResult` | Required | Commits a base patch and returns validation results. |
| `children`       | `ReactNode`                                                  | None     | Additional controls, such as dimension settings.     |

## Accessibility

Fields have visible labels and validation errors. The section uses a fieldset and legend. Rows stack at narrow widths.

## Notes

Pass current props and return the supplied mutation results. The browser owns the shell and resets field drafts when switching tracks. See [settings authoring](trackSettings.md) for composition and draft behavior.
