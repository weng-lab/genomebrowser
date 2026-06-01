# Useful Helpers for Track Modules

These public exports can help when building custom track modules for v2. Track modules should still own their own fetching and rendering behavior; these helpers cover common browser integration points.

## `useAutoTrackHeight`

`useAutoTrackHeight` updates a track's stored `height` from the number of rows a renderer needs. This is useful for display modes such as `squish` or `pack`, where the number of rendered rows can change with the current region or data density.

```tsx
import { useAutoTrackHeight } from "@weng-lab/genomebrowser-v2";

type SquishExampleProps = {
  config: ExampleConfig;
  data: ExampleData;
  height: number;
};

function SquishExample({ config, data, height }: SquishExampleProps) {
  const rows = groupRows(data);
  const rowHeight = useAutoTrackHeight(config.id, rows.length, {
    rowHeight: 12,
    minHeight: 30,
  });

  return (
    <g>
      <rect width="100%" height={height} fill="#ffffff" />
      {rows.map((row, rowIndex) => (
        <g key={rowIndex} transform={`translate(0,${rowIndex * rowHeight})`}>
          {/* render row */}
        </g>
      ))}
    </g>
  );
}
```

The hook returns the configured `rowHeight`. It also updates the track store after render when the computed height differs from the current track height.

Options:

- `rowHeight`: pixel height per row, default `12`
- `minHeight`: minimum track height, default `30`

Only call this hook from React renderers that run inside `GenomeBrowser`, because it uses the browser's track store context.

## `useTrackStore`

`useTrackStore` reads from the active browser's track store. It is mainly useful for settings components or advanced renderers that need access to other track state.

```tsx
import { useTrackStore } from "@weng-lab/genomebrowser-v2";

function ExampleSettings({ config }: { config: ExampleConfig }) {
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <button onClick={() => updateTrack(config.id, { height: config.height + 10 })}>
      Taller
    </button>
  );
}
```

Prefer using the `updateTrack` prop passed to settings components when that is enough. Reach for `useTrackStore` when a component needs a selector or store behavior that is not already passed through props.

## Notes

- `defineTrackModule` is still the main extension point for custom track types. See [Tracks and track modules](tracks.md).
- Only documented public exports should be used by downstream packages. Internal helpers used by built-in tracks may change unless they are exported from the package entry point.
- Do not run browser store hooks outside `GenomeBrowser`; they depend on React context provided by the browser.
