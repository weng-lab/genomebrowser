# Useful Helpers for Track Modules

These public exports can help when building custom track modules for v2. Track modules should still own their own fetching and rendering behavior; these helpers cover common browser integration points.

The stable public surface for custom track authors is the package entry point, especially `defineTrackModule`, the module types, `fetchOnChange`, browser feature hooks, store factories, store hooks, and first-party modules/types. Prefer these documented exports over importing from internal package paths.

Helpers for custom tracks are exposed from the package entry point. Pure utilities live under the module system, while browser-backed helpers such as tooltips and auto-height are owned by their browser features and exposed through public hooks so tracks do not import browser implementation details directly.

## `useAutoTrackHeight`

`useAutoTrackHeight` updates a track's stored `height` from the number of rows a renderer needs. This is useful for display modes such as `squish` or `pack`, where the number of rendered rows can change with the current region or data density.

```tsx
import { useAutoTrackHeight } from "@weng-lab/genomebrowser-v2";

type SquishExampleProps = {
  id: string;
  config: ExampleConfig;
  data: ExampleData;
  height: number;
};

function SquishExample({ id, data, height }: SquishExampleProps) {
  const rows = groupRows(data);
  const rowHeight = useAutoTrackHeight(id, rows.length, {
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

## `fetchOnChange`

`fetchOnChange` marks module config schema fields that should trigger a data refetch when their values change. The browser always refetches when the active render region changes; for config-only changes, it builds a fetch signature from only the marked fields in `track.config`.

```ts
import { z } from "zod";
import { defineTrackModule, fetchOnChange } from "@weng-lab/genomebrowser-v2";

const exampleConfigSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  colorScale: z.string().default("linear"),
});

export const exampleTrackModule = defineTrackModule({
  type: "example",
  configSchema: exampleConfigSchema,
  fetch: fetchExample,
  render: { full: FullExample },
});
```

Changing `url` causes the browser to refetch track data. Changing `colorScale` does not refetch; it only re-renders with existing data.

Use `fetchOnChange` for fields that affect fetched data, such as URLs, dataset lists, assemblies, versions, or query parameters. Do not use it for purely visual settings such as colors, labels, height, display mode, or fixed y-axis ranges.

`fetchOnChange` can wrap nested schemas. For example, built-in multi-file tracks mark each dataset URL or channel URL instead of marking the entire visual config.

## `SettingsSection`

`SettingsSection` is a small layout component for module-specific settings panels. It keeps first-party and custom settings sections visually consistent without requiring modules to import browser settings internals.

```tsx
import { SettingsSection, type TrackSettingsProps } from "@weng-lab/genomebrowser-v2";

function ExampleSettings({ config, updateConfig }: TrackSettingsProps<ExampleConfig>) {
  return (
    <SettingsSection title="Example">
      <label>
        URL
        <input value={config.url} onChange={(event) => updateConfig({ url: event.target.value })} />
      </label>
    </SettingsSection>
  );
}
```

## `useTrackStore`

`useTrackStore` reads from the active browser's track store. It is mainly useful for settings components or advanced renderers that need access to other track state.

```tsx
import type { TrackSettingsProps } from "@weng-lab/genomebrowser-v2";

function ExampleSettings({ config, updateConfig }: TrackSettingsProps<ExampleConfig>) {
  const useLogScale = () => updateConfig({ scale: "log" });

  return (
    <button onClick={useLogScale}>Use log scale</button>
  );
}
```

Prefer using the `updateConfig` prop passed to module settings components when that is enough. Reach for `useTrackStore` when a component needs a selector or store behavior that is not already passed through props.

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
  settingsStore={settingsStore}
/>;
```

Module-specific settings should still be attached to the module with `settingsComponent`. Store-level overrides are for browser-owned UI, not track-specific config fields.

## `useDraggableSettingsModal`

`useDraggableSettingsModal` supports custom settings modal shells. It manages modal position and drag handlers for components supplied through `createSettingsStore`.

Most track modules do not need this hook. Use it when replacing the browser-owned settings modal rather than when adding module-specific settings.

## Browser Stores

The package entry point exports store factories and context hooks for applications that need to customize browser state ownership:

- `createBrowserStore`: creates region, highlight, and browser interaction state
- `createTrackStore`: creates validated track state and track mutation actions
- `createSettingsStore`: creates settings modal state and optional settings UI overrides
- `createContextMenuStore`: creates context menu state
- `useBrowserStore`, `useTrackStore`, `useSettingsStore`, and `useContextMenuStore`: read stores from the active `GenomeBrowser` context

Applications normally create browser and track stores before rendering `GenomeBrowser`. Track modules should prefer props and documented browser feature hooks over reaching into stores directly.

## First-party Modules and Types

The package entry point exports the built-in modules and their public types:

- `bigWigModule` and BigWig types
- `bigBedModule`, `fetchBigBedRows`, `DenseBigBed`, `SquishBigBed`, and BigBed types
- `bulkBedModule` and BulkBed types
- `transcriptModule` and Transcript types
- `methylCModule` and MethylC types

See [Built-in tracks](tracks/README.md) for module-specific config fields and fetch behavior.

`fetchBigBedRows`, `DenseBigBed`, and `SquishBigBed` are public BigBed reuse points for custom BigBed-derived modules. Use them when a custom module needs to reuse BigBed loading, parsing, and rendering while owning a schema-specific `type`, tooltip component, and interaction item type. Import them from the package entry point rather than from internal source paths.

## `useTooltip`

`useTooltip` lets custom renderers use the browser-managed tooltip overlay without importing browser internals. Renderers still own hit testing and semantic callbacks; use `useInteraction<Item>()` when the renderer decides those interactions happened.

```tsx
import { useInteraction, useTooltip } from "@weng-lab/genomebrowser-v2";

function DenseExample({ config, data }: ExampleRendererProps) {
  const interaction = useInteraction<ExampleItem>();
  const tooltip = useTooltip({ type: "example", config });

  return data.map((item) => (
    <rect
      key={item.id}
      onClick={() => interaction?.onClick?.(item)}
      onMouseEnter={(event) => {
        interaction?.onHover?.(item);
        tooltip.show(item, event);
      }}
      onMouseLeave={() => {
        interaction?.onLeave?.(item);
        tooltip.hide();
      }}
    />
  ));
}
```

If the registered module has a `tooltipComponent`, `tooltip.show(item, event)` renders it with `{ item, config }` and positions it in the active browser. If no tooltip component is present, `show` is a silent no-op. `show` is safe to call from continuous `onMouseMove` handlers; tooltip state is scoped to the active `GenomeBrowser` and suppressed while panning.

## Notes

- `defineTrackModule` is still the main extension point for custom track types. See [Tracks and track modules](tracks.md).
- Only documented public exports should be used by downstream packages. Internal helpers used by built-in tracks may change unless they are exported from the package entry point.
- Do not run browser store hooks outside `GenomeBrowser`; they depend on React context provided by the browser.
