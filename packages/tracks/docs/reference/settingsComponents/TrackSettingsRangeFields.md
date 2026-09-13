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

`TrackSettingsRangeFieldsProps` describes the props below. `onCommit` must return the mutation result; return the result of core's `updateTrack` when used in a module settings form.

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
| `onCommit` | `(range: { min: number; max: number } \| undefined) => TrackMutationResult` | Required     | Attempts to persist a complete range or automatic range.                 |

### Independent mode

| Prop       | Type                                                                          | Default  | Description                                                      |
| ---------- | ----------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `mode`     | `"independent"`                                                               | Required | Allows either bound to be omitted independently.                 |
| `range`    | `{ min?: number; max?: number } \| undefined`                                 | Required | Current accepted override. `min`, `max`, or both may be present. |
| `onCommit` | `(range: { min?: number; max?: number } \| undefined) => TrackMutationResult` | Required | Attempts to persist independent overrides or automatic range.    |

Every entered bound must be finite. When both are present, minimum must be less than maximum. Complete mode reports an error until both bounds are present. Independent mode can commit either bound alone.

## Commit behavior

Valid changed drafts commit after 300 ms, or immediately on blur or Enter. Escape restores the accepted value. Rejected drafts remain visible with an error. External values replace the local value when no unresolved draft remains.

The component owns its draft, while the caller owns the accepted value. It does not access browser stores directly. `onCommit` returns `TrackMutationResult` from core: success accepts the draft; failure retains it and displays the returned error.

## Accessibility

Each bound has a visible label. Both inputs reference a shared validation error. Use automatic range is a keyboard-operable button.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
