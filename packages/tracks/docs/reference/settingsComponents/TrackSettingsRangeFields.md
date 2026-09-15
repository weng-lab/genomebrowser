# TrackSettingsRangeFields

Edit optional numeric bounds as a complete pair or independent overrides.

## Usage

```tsx
import {
  TrackSettingsRangeFields,
  type TrackSettingsRangeFieldsProps,
} from "@weng-lab/genomebrowser-tracks/shared";

export function FieldExample({
  range,
  onCommit,
}: Extract<TrackSettingsRangeFieldsProps, { mode: "independent" }>) {
  return <TrackSettingsRangeFields mode="independent" range={range} onCommit={onCommit} />;
}
```

## API

The range is optional in both modes. Selecting **Use automatic range** commits `undefined`.

| Prop           | Type     | Default     | Description                                       |
| -------------- | -------- | ----------- | ------------------------------------------------- |
| `minimumLabel` | `string` | `"Minimum"` | Visible label for the lower bound in either mode. |
| `maximumLabel` | `string` | `"Maximum"` | Visible label for the upper bound in either mode. |

### Complete mode

| Prop       | Type                                                                        | Default      | Description                                                              |
| ---------- | --------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `mode`     | `"complete"`                                                                | `"complete"` | Requires both bounds together. Both blank values select automatic range. |
| `range`    | `{ min: number; max: number } \| undefined`                                 | Required     | Current accepted complete range.                                         |
| `onCommit` | `(range: { min: number; max: number } \| undefined) => TrackMutationResult` | Required     | Submits a complete range or automatic range.                             |

### Independent mode

| Prop       | Type                                                                          | Default  | Description                                                      |
| ---------- | ----------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `mode`     | `"independent"`                                                               | Required | Allows either bound to be omitted independently.                 |
| `range`    | `{ min?: number; max?: number } \| undefined`                                 | Required | Current accepted override. `min`, `max`, or both may be present. |
| `onCommit` | `(range: { min?: number; max?: number } \| undefined) => TrackMutationResult` | Required | Submits independent overrides or automatic range.                |

Every entered bound must be finite. When both are present, minimum must be less than maximum. In complete mode, filling only one bound produces an error.

## Commit behavior

Valid changed drafts commit after 300 ms, or immediately on blur or Enter. Escape restores the accepted value. External values replace the local value when no unresolved draft remains.

The field keeps its draft locally and takes the accepted value from its props. Return `TrackMutationResult` from `onCommit`, using core's `updateTrack` result in a module form. Success accepts the draft; failure retains it and shows the returned error. The field does not read browser stores.

## Accessibility

Each bound has a visible label. Both inputs reference a shared validation error. Use automatic range is a keyboard-operable button.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
