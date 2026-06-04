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
import type { TrackSettingsProps } from "@weng-lab/genomebrowser-v2";

function ExampleSettings({ config, updateTrack }: TrackSettingsProps<ExampleConfig>) {
  const addTenPixels = () => updateTrack({ height: config.height + 10 });

  return (
    <button onClick={addTenPixels}>Taller</button>
  );
}
```

Prefer using the `updateTrack` prop passed to settings components when that is enough. Reach for `useTrackStore` when a component needs a selector or store behavior that is not already passed through props.

## `useSettingsStore`

`useSettingsStore` reads from the active browser's settings store. The browser creates a default settings store internally, but `GenomeBrowser` can receive a custom `settingsStore` when an app needs to replace the main modal shell or base settings UI.

```tsx
import { createSettingsStore } from "@weng-lab/genomebrowser-v2";

const settingsStore = createSettingsStore({
  modalComponent: MuiSettingsModal,
  baseSettingsComponent: MuiBaseSettings,
});

<GenomeBrowser
  browserStore={browserStore}
  trackStore={trackStore}
  modules={modules}
  settingsStore={settingsStore}
/>;
```

Module-specific settings should still be attached to the module with `settingsComponent`. Store-level overrides are for browser-owned UI, not track-specific config fields.

## `useInteraction`

`useInteraction` lets custom renderers opt into the browser-managed interaction contract. It reads interaction fields from the track config, calls callbacks with `{ item, config, event }`, and manages tooltips through the active `GenomeBrowser`.

```tsx
import { useInteraction } from "@weng-lab/genomebrowser-v2";

function DenseExample({ config, data }: ExampleRendererProps) {
  const { handleClick, handleHover, handleLeave } = useInteraction({
    config,
    fallback: (item) => item.name,
  });

  return data.map((item) => (
    <rect
      key={item.id}
      onClick={(event) => handleClick(item, event)}
      onMouseOver={(event) => handleHover(item, event)}
      onMouseOut={(event) => handleLeave(item, event)}
    />
  ));
}
```

If `config.tooltip` is present, the hook renders it with `{ item, config }`. If no custom tooltip is present and `fallback` returns text, the browser renders a default tooltip.

## Notes

- `defineTrackModule` is still the main extension point for custom track types. See [Tracks and track modules](tracks.md).
- Only documented public exports should be used by downstream packages. Internal helpers used by built-in tracks may change unless they are exported from the package entry point.
- Do not run browser store hooks outside `GenomeBrowser`; they depend on React context provided by the browser.
