# Custom Track Modules

> This page is awaiting migration. See the [documentation index](../README.md) for reviewed references and the [migration queue](README.md) for remaining topics.

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
    <fieldset>
      <legend>Signal</legend>
      <label>
        Data URL
        <input
          disabled={track.source === "host"}
          type="url"
          value={track.config.url}
          onChange={(event) => {
            const result = updateTrack({ config: { url: event.currentTarget.value } });
            if (!result.ok) console.error(result.error);
          }}
        />
      </label>
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
    </fieldset>
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

For definition options, fetch/render contracts, resources, settings, and instance types, see [Track modules](../reference/trackModules.md). For callback, tooltip, and height hooks, see [Runtime helpers](../reference/runtimeHelpers.md).

## Register and create

Register a module before any track of its type enters the store:

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";

declare function selectInterval(start: number, end: number): void;

const useTrackStore = createTrackStore({
  modules: [customSignalModule],
  tracks: [
    customSignalModule.create(
      {
        base: {
          id: "custom-signal",
          title: "Custom signal",
        },
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

The optional second argument contains per-instance callbacks and is not serializable collection data. Its item type and parsed config type come from the module.

## Fixed annotations

Use [TrackOverlay](../reference/TrackOverlay.md) for fixed SVG content or [TrackLabel](../reference/TrackLabel.md) for text annotations.

## Hosting browser stores

Renderers, settings, and tooltip components use `useGenomeBrowser()` to resolve their hosting browser's bound stores. See [useGenomeBrowser](../reference/browserStore.md#usegenomebrowser) for selectors and imperative access. Fetchers and module-definition code cannot call React hooks.
