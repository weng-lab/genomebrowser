# Runtime helpers

These helpers connect custom track renderers and settings to browser behavior. Use the schema helper when defining a module; use renderer hooks inside the track components mounted by `GenomeBrowser`.

## fetchOnChange

`fetchOnChange<Schema extends z.core.$ZodType>(schema: Schema): Schema` marks a configuration schema whose value affects fetching or fetch-time processing. It returns the same schema object without changing its parsing rules.

```ts
import { z } from "zod";
import { fetchOnChange } from "@weng-lab/genomebrowser";

const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  threshold: z.number().default(0),
});
```

Here, changing `url` requests data again. A threshold used only while rendering can remain unmarked. Mark every value read by the fetcher or its processing logic. Region, assembly, display, and render-width changes also cause requests independently of these markers.

Core traverses object properties and array elements to find marked schemas. A marker on an object or array includes its entire value. Apply markers outside wrappers such as optional/default schemas, as in `fetchOnChange(z.string().optional())`; the traversal does not descend through every Zod wrapper. The marker does not issue requests by itself; the mounted browser observes committed track changes.

## useInteraction

`useInteraction<Item>(): TrackRendererInteraction<Item> | null` reads item-only callbacks for the current renderer. The browser supplies them from the instance's [interaction callbacks](trackModules.md#interactions-and-tooltips), with runtime context already bound.

```tsx
import { useInteraction } from "@weng-lab/genomebrowser";

type Item = { start: number; end: number };
export function ClickableInterval({ item }: { item: Item }) {
  const interaction = useInteraction<Item>();
  return <rect width={20} height={10} onClick={() => interaction?.onClick?.(item)} />;
}
```

The returned object can contain `onClick`, `onHover`, and `onLeave`, each accepting one `Item` and returning `void`. The hook does not attach DOM events or decide what item they represent. Without a provider or configured interaction it returns `null`; individual callbacks can also be absent. This example wires pointer clicks only and does not provide a keyboard control.

## useTooltip

`useTooltip<Item, Config>()` returns `show(item, position): void` and `hide(): void`. Call it inside a mounted track renderer so it can read the current track context, module tooltip component, and browser SVG coordinates.

```tsx
import { useTooltip } from "@weng-lab/genomebrowser";

export function HoverPoint({ value }: { value: number }) {
  const tooltip = useTooltip<number, { url: string }>();
  return (
    <circle
      r={4}
      onMouseEnter={(event) => tooltip.show(value, event)}
      onMouseLeave={tooltip.hide}
    />
  );
}
```

The module using this renderer must provide a matching `tooltipComponent` to show content. `position` needs numeric `clientX` and `clientY` fields in CSS viewport coordinates, so a React mouse event can be passed directly. `show` passes the item and current runtime context to that component and converts the pointer position into SVG coordinates.

Shows are scheduled on the next animation frame; a later call cancels a pending show from the same hook. Disabled interactions hide the tooltip, and a missing module tooltip component makes `show` a no-op. `hide` cancels a pending show and hides content owned by this hook. Unmounting performs the same cleanup. Calling the hook without the required browser/track contexts throws.

The browser places a tooltip corner 10 logical SVG units from the pointer on each axis and switches corners near edges. Oversized content can extend beyond the browser. Tooltip content does not intercept pointer events. The hook provides no keyboard trigger or accessible description relationship; supply meaningful content and any required accessible alternative in the track UI.

## useAutoTrackHeight

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

The hook requires a mounted browser height context and throws without it. A missing track ID produces no update. It uses the track store's validated update action but does not return mutation errors. Supply finite, meaningful row counts and positive dimensions; the hook has no separate input validator. Base updates do not themselves trigger a data request.
