# Recipes

These recipes assume stable `useBrowserStore` and `useTrackStore` hooks created as shown in [Getting started](gettingStarted.md).

## Read current URL and color in interactions and tooltips

Core v2 supplies the same current runtime context to application callbacks and module tooltips. This direct setup does not require TrackSelect or another catalog UI:

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
declare function openItem(id: string, details: { url: string; color: string | undefined }): void;

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
    id: "runtime-example",
    title: "Runtime example",
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

The renderer emits only `item`. The browser adds the latest validated context when it invokes the application callback or renders the tooltip. Updating the track's URL or color changes later events and tooltips; it does not make base or interaction changes fetch data, and config requests remain controlled by `fetchOnChange`.

### Keep hover callbacks lightweight

Treat `onHover` as a potentially high-frequency callback. Renderers decide what counts as a semantic hover target, and moving across a dense signal can still expose many different items quickly. Do not assume every track type throttles or deduplicates hover events for the application.

- Avoid putting transient hover state in a component above `GenomeBrowser`; each update can revisit the entire browser subtree.
- Keep React hover state in the smallest component that renders it, and skip updates when the semantic item has not changed.
- For an imperative readout that does not affect React output, a ref can update the target directly without scheduling a render.
- When several isolated components need hover data, use a host-owned external store with narrow subscriptions rather than lifting the state to the page root.
- Keep expensive requests and analytics out of raw hover handlers, or deduplicate and rate-limit them according to application needs.
- Clear any retained application hover state in `onLeave`.

Memoizing the browser does not fix state placed above it. First isolate or deduplicate the high-frequency state; optimize individual computations only when measurement shows they remain expensive.

## Add, remove, reorder, and update tracks

Create a track through its module, then check the store mutation result:

```ts
const nextTrack = bigWigModule.create({
  id: "signal-2",
  title: "Second signal",
  config: { url: "YOUR_URL_HERE" },
});

const addResult = useTrackStore.getState().addTrack(nextTrack);
if (!addResult.ok) console.error(addResult.error);

const updateResult = useTrackStore.getState().updateBase("signal-2", {
  title: "Renamed signal",
  height: 100,
});
if (!updateResult.ok) console.error(updateResult.error);

const configResult = useTrackStore.getState().updateConfig("signal-2", {
  fillWithZero: true,
});
if (!configResult.ok) console.error(configResult.error);

const ids = useTrackStore.getState().order;
const reorderResult = useTrackStore.getState().reorderTracks([...ids].reverse());
if (!reorderResult.ok) console.error(reorderResult.error);

const removeResult = useTrackStore.getState().removeTrack("signal-2");
if (!removeResult.ok) console.error(removeResult.error);
```

A reorder array must contain every current track ID exactly once. `updateBase` preserves the existing ID; replace a track if its identity or type must change.

## Apply track changes atomically

Use `applyTrackChanges` when adds and removals must succeed together. This also permits replacing a track with another instance using the same ID:

```ts
const replacement = bigWigModule.create({
  id: "signal",
  title: "Replacement signal",
  config: { url: "YOUR_URL_HERE" },
});

const result = useTrackStore.getState().applyTrackChanges({
  remove: ["signal"],
  add: [replacement],
});

if (!result.ok) console.error(result.error);
```

If any ID, module, or config is invalid, no part of the change is applied.

## Configure a custom assembly

Use `createAssemblyDefinition` to validate and snapshot custom sequence bounds. Sequence keys can use any non-empty name and are matched exactly and case-sensitively.

```ts
import { createAssemblyDefinition, createBrowserStore } from "@weng-lab/genomebrowser";

const customAssembly = createAssemblyDefinition({
  id: "my-reference",
  chromosomes: {
    contigA: 125_000,
    "scaffold-2": 48_500,
  },
});

const useBrowserStore = createBrowserStore({
  assembly: customAssembly,
  region: { chromosome: "contigA", start: 0, end: 10_000 },
});
```

You may also pass an object with the same `AssemblyDefinition` shape directly to `createBrowserStore`; store construction performs the same validation and snapshot. IDs do not register definitions globally, so a custom definition may reuse a built-in ID without inheriting that preset's chromosomes. Definitions require a non-empty ID and chromosome map, non-empty sequence names, and positive safe-integer lengths.

## Parse, navigate, and zoom

`createBrowserStore` and `setRegion` accept only `GenomicRegion` objects. When a user supplies text, call the assembly-independent `parseRegion` facade explicitly before updating the store:

```ts
import { parseRegion, type GenomicRegion } from "@weng-lab/genomebrowser";

function goToRegion(input: string) {
  let region: GenomicRegion;

  try {
    region = parseRegion(input);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid region");
    return;
  }

  const result = useBrowserStore.getState().setRegion(region);
  if (!result.ok) {
    console.error(result.error);
  } else if (result.clamped) {
    console.info(`Showing ${result.region.chromosome}:${result.region.start}-${result.region.end}`);
  }
}

goToRegion("chr12:53,372,922-53,423,700");
goToRegion("  chr12\t53372922\t53423700  ");
```

The parser accepts `chromosome:start-end` and exactly three whitespace-delimited fields. It accepts commas in coordinates, trims surrounding whitespace, and allows whitespace next to `:` and `-` or one or more whitespace characters between fields. It preserves chromosome case and throws for structurally malformed or ambiguous strings. Parsing does not check assembly membership, coordinate ordering or bounds, and does not clamp; `setRegion` performs those checks against the store's assembly. If a custom sequence name conflicts with the parser's punctuation grammar, construct a `GenomicRegion` object directly.

Core coordinates are zero-based and half-open. The first base is `{ start: 0, end: 1 }`, and width is `end - start`.

```ts
const browser = useBrowserStore.getState();

const regionResult = browser.setRegion({ chromosome: "chr2", start: 2_000_000, end: 2_100_000 });
if (!regionResult.ok) console.error(regionResult.error);

const zoomInResult = browser.zoom(0.5); // Zoom in around the region center.
if (!zoomInResult.ok) console.error(zoomInResult.error);

const zoomOutResult = browser.zoom(2, 2_050_000); // Zoom out around a genomic base.
if (!zoomOutResult.ok) console.error(zoomOutResult.error);
```

`setRegion` and `zoom` return the committed region and `clamped` status on success. A partial chromosome overlap clamps to its bounds; a completely non-overlapping, malformed, or unknown region returns `{ ok: false, code, error }`. Zoom factors must be finite and greater than zero, and explicit centers must be safe integers within the current chromosome. Runtime failures do not throw and leave the previous state unchanged.

## Add and remove highlights

```ts
useBrowserStore.getState().addHighlight({
  id: "candidate",
  region: { chromosome: "chr2", start: 2_020_000, end: 2_030_000 },
  color: "#f59e0b",
  opacity: 0.25,
});

useBrowserStore.getState().removeHighlight("candidate");
```

Omit `chromosome` to display the same coordinate range on any current chromosome. Adding an existing highlight ID is a no-op. Invalid highlight input throws.

## Keep track width responsive

`GenomeBrowser` renders at the width stored in the browser store. Observe the host element and subtract the configured margin:

```tsx
function ResponsiveBrowser() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const marginWidth = useBrowserStore.getState().marginWidth;
      const result = useBrowserStore
        .getState()
        .setTrackWidth(Math.max(1, entry.contentRect.width - marginWidth));
      if (!result.ok) console.error(result.error);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: "100%", overflowX: "auto" }}>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </div>
  );
}
```

`setTrackWidth` returns `{ ok: true, trackWidth }` after committing a finite positive width. Invalid runtime widths return `{ ok: false, code, error }` and preserve the existing width.

## Share the track store with the UI package

`@weng-lab/genomebrowser-ui@alpha` is a separate optional package. Pass exactly the same track store hook to `GenomeBrowser` and `TrackSelect` so catalog validation and mutations use the browser's registry and tracks:

```tsx
import { TrackSelect } from "@weng-lab/genomebrowser-ui";

<>
  <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
  <TrackSelect
    open={trackSelectOpen}
    onClose={() => setTrackSelectOpen(false)}
    trackCatalogs={trackCatalogs}
    useTrackStore={useTrackStore}
  />
</>;
```

Register every module referenced by the catalogs in that shared store. See the UI package's own shipped docs for catalog shape and additional peer dependencies.
