# Custom Track Modules

Create a custom module when a data type needs its own validated config, request logic, renderers, settings, or semantic interactions. Applications that only use built-in tracks do not need this API.

Module schemas use Zod directly, so module authors should install Zod as an application dependency:

```sh
pnpm add zod@^4
```

## A complete small module

The data URL affects the response, so the schema marks it with `fetchOnChange`. The visual threshold is unmarked: changing it re-renders existing data without making another request.

```tsx
import { z } from "zod";
import {
  SettingsSection,
  defineTrackModule,
  fetchOnChange,
  useInteraction,
  useSettingsStore,
  useTrackStore,
  useTooltip,
  type TrackRendererProps,
} from "@weng-lab/genomebrowser";

const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  threshold: z.number().default(0),
});

type Config = z.infer<typeof configSchema>;
type Item = { start: number; end: number; value: number };
type Data = Item[];

function SignalRenderer({ config, data, region, width, height }: TrackRendererProps<Config, Data>) {
  const interaction = useInteraction<Item>();
  const tooltip = useTooltip<Item, Config>();
  const bases = region.end - region.start;

  return data
    .filter((item) => item.value >= config.threshold)
    .map((item) => {
      const x = ((item.start - region.start) / bases) * width;
      const itemWidth = Math.max(1, ((item.end - item.start) / bases) * width);

      return (
        <rect
          key={`${item.start}-${item.end}`}
          x={x}
          width={itemWidth}
          height={height}
          onClick={() => interaction?.onClick?.(item)}
          onMouseEnter={(event) => tooltip.show(item, event)}
          onMouseLeave={tooltip.hide}
        />
      );
    });
}

function SignalSettings() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const threshold = useTrackStore((state) => (state.getTrack(trackId)?.config as Config).threshold);
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <SettingsSection title="Signal">
      <label>
        Threshold
        <input
          type="number"
          value={threshold}
          onChange={(event) => {
            const result = updateTrack(trackId, {
              config: { threshold: event.currentTarget.valueAsNumber },
            });
            if (!result.ok) console.error(result.error);
          }}
        />
      </label>
    </SettingsSection>
  );
}

export const customSignalModule = defineTrackModule<Item>()({
  type: "custom-signal",
  defaults: { height: 80, color: "#2266aa" },
  configSchema,
  async fetch({ config, region }): Promise<Data> {
    const query = new URLSearchParams({
      chromosome: region.chromosome,
      start: String(region.start),
      end: String(region.end),
    });
    const response = await fetch(`${config.url}?${query}`);
    if (!response.ok) throw new Error(`Signal request failed with ${response.status}`);
    return response.json() as Promise<Data>;
  },
  render: { full: SignalRenderer },
  settingsComponent: SignalSettings,
  tooltipComponent: ({ item, context }) => (
    <text fill={context.base.color}>
      {item.value} from {context.config.url}
    </text>
  ),
});
```

Settings components receive no track snapshot props. Read the active track ID with `useSettingsStore`, then select the smallest value each field renders with `useTrackStore`; unchanged selections do not re-render when another setting changes. Call the store's `updateTrack(trackId, update)` action with optional shallow `base` and `config` patches. The nearest browser provides both stores, so multiple browser instances remain isolated. When a nested patch must preserve siblings, use `useTrackStoreApi().getState()` inside the event handler to read the latest track without adding a render subscription.

The fetch function receives only parsed config and a genomic region. Return raw regional data; the renderer owns conversion to pixels and display-specific shaping. Throwing from fetch produces the browser's error state for that track.

Renderer-map keys are allowed display values. If `defaults.display` is absent, the first key is the default. Base defaults belong in `defaults`; config defaults belong in the Zod schema. Base colors use case-insensitive six-digit `#RRGGBB` syntax. Creation uses `"#000000"` when `defaults.color` and the create input both omit color, so validated track instances always have a concrete base color.

## Register and create

Register a module before any track of its type enters the store:

```ts
const useTrackStore = createTrackStore({
  modules: [customSignalModule],
  tracks: [
    customSignalModule.create(
      {
        id: "custom-signal",
        title: "Custom signal",
        config: { url: "YOUR_URL_HERE" },
      },
      {
        onClick: (item, context) => {
          selectInterval(item.start, item.end);
          console.log(context.config.url, context.base.color);
        },
      },
    ),
  ],
});
```

The optional second argument contains per-instance callbacks and is not serializable collection data. Its item type and parsed config type come from the module. A callback may ignore its second argument, so existing one-argument functions remain usable.

## Settings, tooltip, and interactions

Module settings receive no props. Read the active ID from `useSettingsStore`, select active values with `useTrackStore`, and call `updateTrack` from that same store. An update accepts optional shallow `base` and `config` patches, so one settings action can update both atomically. Check its mutation result for user-entered values. The browser still renders the standard title, display, color, and height controls separately.

The renderer decides what semantic item a click or hover represents. `useInteraction<Item>()` returns item-only handlers because the browser binds the current runtime context. `useTooltip<Item, Config>()` reads that same context and opens the module's browser-positioned `tooltipComponent` with `{ item, context }`. Renderers do not pass a type or config to either hook. Both hooks require the renderer to run inside `GenomeBrowser`.

`context.type`, `context.base`, and `context.config` reflect the current validated instance. Later base or config mutations therefore reach later interactions and tooltip renders without changing fetch behavior: only `fetchOnChange` fields control config-triggered requests. The core context does not include metadata owned by a collection UI.

Use only package-root exports for module authoring. BigBed-specific renderer reuse is not currently a recommended extension path.
