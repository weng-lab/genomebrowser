# Custom Track Modules

Create a custom module when a data type needs its own validated config, request logic, renderers, settings, or semantic interactions. Applications that only use modules from `@weng-lab/genomebrowser-tracks` do not need this API.

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
  useTooltip,
  type TrackRendererProps,
  type TrackSettingsProps,
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

function SignalSettings({ track, updateTrack }: TrackSettingsProps<Config, Item>) {
  return (
    <SettingsSection title="Signal">
      <label>
        Threshold
        <input
          type="number"
          value={track.config.threshold}
          onChange={(event) => {
            const result = updateTrack({
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
  async fetch({ track, demand }): Promise<Data> {
    const { config } = track;
    const { region } = demand;
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

Settings components receive `{ track, updateTrack }`. `track` is the current complete, shallow read-only instance, including its type, base, parsed config, and optional interaction callbacks. The supplied `updateTrack` is already bound to that track's ID and passes through the browser's interaction gate. Return or inspect its `TrackMutationResult` when an edit can fail. Each `base`, `config`, or `interaction` patch is shallow, so replace a complete nested object or array when changing one of its values.

The fetch function receives `{ track, demand, resources }`. `track` contains shallow read-only track ID, module type, selected display, and complete parsed config values. `demand` contains the assembly, requested render region, and its width in SVG coordinate units. Do not mutate either view. The region may be larger than the visible viewport because the browser overscans for panning. A fetcher may return raw records or process them for the supplied display and width. Throwing from fetch produces the browser's error state for that track.

A renderer receives both genomic windows. `region` spans the complete overscanned render width, so use it with `width` for horizontal coordinates and keep its side data available for panning. `visibleRegion` is the genomic viewport the user can see. Use `visibleRegion` when visible features determine a track's row count, total height, or another viewport-only measurement. While a request settles, `region` may still describe the previous displayed data. Compare chromosomes before treating a record as visible.

## Fetcher resources

`resources` is a small key-value store your fetcher can use to keep values alive between requests:

```ts
async fetch({ track, demand, resources }): Promise<Data> {
  let file = resources.get<MyFileReader>("file");
  if (!file || file.url !== track.config.url) {
    file = createMyFileReader(track.config.url);
    resources.set("file", file);
  }
  return file.read(demand.region);
}
```

The store is scoped to one track in one mounted `GenomeBrowser`. Two tracks never see each other's values, even when they share a module type, and two browser instances are fully independent. Keys are local strings; you choose their meaning. Values may be anything, including file readers, caches, or module-specific state.

Lifecycle rules:

- Values persist across fetches of the same track, across region, width, assembly, display, and unmarked-config changes.
- Core never inspects or evicts values. When a source-affecting config value changes, your fetcher decides whether to keep, validate, or replace what it stored.
- Removing the track releases its values. If a track with the same ID is added again, its fetcher starts with an empty store.
- Unmounting the browser releases all remaining values.

Resources are storage, not a managed cache: there is no eviction policy, sharing between tracks, or cleanup hook. Store only what your fetcher can rebuild on demand.

The browser requests the track again when its region, SVG width, assembly, display, or marked config changes. Width changes settle briefly first so a continuous resize produces a single request; any other change promotes a pending width immediately. Wrap every config field used by the request or fetch-time processing with `fetchOnChange`. Leave fields used only by the renderer unmarked.

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

Module settings use `TrackSettingsProps<Config, Item>` as their input contract. Read current values from `track` and submit live edits through the supplied `updateTrack`. One update may contain optional shallow `base`, `config`, and `interaction` patches; core validates the complete candidate once and commits all supplied sections or none. The browser still renders the standard title, display, color, and height controls separately, so module settings should render only module-specific config controls.

The renderer decides what semantic item a click or hover represents. `useInteraction<Item>()` returns item-only handlers because the browser binds the current runtime context. `useTooltip<Item, Config>()` reads that same context and opens the module's browser-positioned `tooltipComponent` with `{ item, context }`. Renderers do not pass a type or config to either hook. Both hooks require the renderer to run inside `GenomeBrowser`.

`context.type`, `context.base`, and `context.config` reflect the current validated instance. Later base or config mutations therefore reach later interactions and tooltip renders without changing fetch behavior: only `fetchOnChange` fields control config-triggered requests. The core context does not include metadata owned by a collection UI.

Use only package-root exports for module authoring. BigBed-specific renderer reuse is not currently a recommended extension path.
