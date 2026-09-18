# useAutoTrackHeight

Use this hook when a renderer's row count should determine its track height:

```tsx
import { useAutoTrackHeight } from "@weng-lab/genomebrowser";

export function RowHeight({ trackId, rowCount }: { trackId: string; rowCount: number }) {
  const rowHeight = useAutoTrackHeight(trackId, rowCount, { rowHeight: 14, minHeight: 28 });
  return <text y={rowHeight}>Rows: {rowCount}</text>;
}
```

`useAutoTrackHeight(trackId: string, rowCount: number, options?: AutoTrackHeightOptions): number` returns the configured row height. An effect requests a track height of `Math.max(minHeight, Math.max(1, rowCount) * rowHeight)` when it differs from the current height.

| Option      | Type     | Default | Description                                                |
| ----------- | -------- | ------- | ---------------------------------------------------------- |
| `rowHeight` | `number` | `12`    | Logical SVG height of one row and the hook's return value. |
| `minHeight` | `number` | `30`    | Minimum requested track height.                            |

The hook requires a mounted browser height context and throws without it. A missing track ID produces no update. It uses the track store's validated update action but does not return mutation errors. Supply a finite row count and positive dimensions. The hook does not validate these inputs separately. Base updates do not themselves trigger a data request.

Pass the renderer's `id` as `trackId`, and call the hook unconditionally during rendering. For example, zero rows with the default options request 30 units, while four rows request 48 units. The height update is stored in the shared track store, so browsers sharing that store also share the resulting height.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
