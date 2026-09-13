# Recipes

> This page is awaiting migration. See the [documentation index](../README.md) for reviewed references and the [migration queue](README.md) for remaining topics.

For viewport tasks, see [assemblies and region parsing](../reference/assembliesAndRegions.md), [navigation, selection, and highlights](../reference/browserStore.md), and [browser sizing](../reference/GenomeBrowser.md).

For track mutations and pinning, see the [track-store reference](../reference/trackStore.md).

These recipes assume stable `useBrowserStore` and `useTrackStore` hooks created as shown in [Getting started](gettingStarted.md).

## Read current URL and color in interactions and tooltips

Core v2 supplies the same current runtime context to application callbacks and module tooltips. This direct setup does not require TrackSelect or another collection UI:

```tsx
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  fetchOnChange,
  hg38,
  useInteraction,
  useTooltip,
  type TrackRendererProps,
} from "@weng-lab/genomebrowser";

type Item = { id: string; start: number; end: number };
const configSchema = z.object({ url: fetchOnChange(z.string().min(1)) });
type Config = z.infer<typeof configSchema>;

// Implement this host-owned navigation function in your application.
declare function openItem(id: string, details: { url: string; color: string }): void;

function Renderer({ data }: TrackRendererProps<Config, Item[]>) {
  const interaction = useInteraction<Item>();
  const tooltip = useTooltip<Item, Config>();

  return data.map((item) => (
    <rect
      key={item.id}
      onClick={() => interaction?.onClick?.(item)}
      onMouseEnter={(event) => tooltip.show(item, event)}
      onMouseLeave={tooltip.hide}
    />
  ));
}

const runtimeModule = defineTrackModule<Item>()({
  type: "runtime-example",
  defaults: { color: "#2266aa" },
  configSchema,
  async fetch() {
    return [] as Item[];
  },
  render: { full: Renderer },
  tooltipComponent: ({ item, context }) => (
    <g>
      <text fill={context.base.color}>{item.id}</text>
      <text y={14}>{context.config.url}</text>
    </g>
  ),
});

const runtimeTrack = runtimeModule.create(
  {
    base: {
      id: "runtime-example",
      title: "Runtime example",
    },
    config: { url: "YOUR_URL_HERE" },
  },
  {
    onClick: (item, context) => {
      openItem(item.id, {
        url: context.config.url,
        color: context.base.color,
      });
    },
  },
);

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1, end: 1_000 },
});
const useTrackStore = createTrackStore({ modules: [runtimeModule], tracks: [runtimeTrack] });

export function App() {
  return <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />;
}
```

The renderer emits only `item`. The browser adds the latest validated context when it invokes the application callback or renders the tooltip. Updating the track's URL or color changes later events and tooltips. Display changes request data, while other base and interaction changes do not. Config requests remain controlled by `fetchOnChange`.

### Keep hover callbacks lightweight

Treat `onHover` as a potentially high-frequency callback. Renderers decide what counts as a semantic hover target, and moving across a dense signal can still expose many different items quickly. Do not assume every track type throttles or deduplicates hover events for the application.

- Avoid putting transient hover state in a component above `GenomeBrowser`; each update can revisit the entire browser subtree.
- Keep React hover state in the smallest component that renders it, and skip updates when the semantic item has not changed.
- For an imperative readout that does not affect React output, a ref can update the target directly without scheduling a render.
- When several isolated components need hover data, use a host-owned external store with narrow subscriptions rather than lifting the state to the page root.
- Keep expensive requests and analytics out of raw hover handlers, or deduplicate and rate-limit them according to application needs.
- Clear any retained application hover state in `onLeave`.

Memoizing the browser does not fix state placed above it. First isolate or deduplicate the high-frequency state; optimize individual computations only when measurement shows they remain expensive.

## Share the track store with the UI package

`@weng-lab/genomebrowser-ui@beta` is a separate optional package. Pass exactly the same track store hook to `GenomeBrowser` and `TrackSelect` so collection validation and mutations use the browser's registry and tracks:

```tsx
import { TrackSelect } from "@weng-lab/genomebrowser-ui";

<>
  <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
  <TrackSelect
    open={trackSelectOpen}
    onClose={() => setTrackSelectOpen(false)}
    trackCollections={trackCollections}
    useTrackStore={useTrackStore}
  />
</>;
```

Register every module referenced by the collections in that shared store. See the UI package's own shipped docs for collection shape and additional peer dependencies.
