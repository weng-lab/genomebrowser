# useTooltip

`useTooltip<Item, Config>()` returns `show(item, position): void`, `hide(): void`, and `target(getItem)`. Call it inside a mounted track renderer so it can read the current track context, module tooltip component, and browser SVG coordinates.

```tsx
import { useTooltip } from "@weng-lab/genomebrowser";

export function HoverPoint({ value }: { value: number }) {
  const tooltip = useTooltip<number, { url: string }>();
  return (
    <circle
      r={4}
      ref={tooltip.target(() => value)}
      onMouseEnter={(event) => tooltip.show(value, event)}
      onMouseLeave={tooltip.hide}
    />
  );
}
```

The module using this renderer must provide a matching `tooltipComponent` to show content. `position` needs numeric `clientX` and `clientY` fields in CSS viewport coordinates, so a React mouse event can be passed directly. `show` passes the item and current runtime context to that component and converts the pointer position into SVG coordinates.

`show` schedules the tooltip for the next animation frame. Calling it again before that frame replaces the pending call from the same hook. Without a module tooltip component, `show` does nothing.

`hide` cancels a pending call and hides this hook's tooltip. Unmounting does the same cleanup, and panning also hides the tooltip. Calling the hook outside the required browser and track contexts throws.

Tooltips render in a fixed SVG overlay attached to the document body, at the browser's scale, so the browser's container never clips them. Content inherits styles from the document body rather than the browser's container, so set fonts and colors on the content itself. The browser places a tooltip corner 10 logical SVG units from the pointer on each axis and switches corners to keep the tooltip inside the browser. When it cannot fit inside the browser, it is placed against the window instead, flipping sides as needed and staying 4 pixels from the window edges. Content larger than the window keeps its size and starts at the window's top-left margin. Scrolling or resizing the window dismisses the tooltip.

The overlay uses `z-index: 1500`. A browser inside a native modal `<dialog>` opened with `showModal()` sits in the top layer, above that overlay, so its tooltips are hidden.

Tooltip content does not intercept pointer events. The hook provides no keyboard trigger or accessible description relationship; supply meaningful content and any required accessible alternative in the track UI.

## Overlay composite tooltips

Attach `ref={tooltip.target(getItem)}` to each SVG element that supplies tooltip content. `getItem(position, element, hit)` receives the pointer's CSS viewport coordinates, the registered SVG element, and the hit element within it. Return the item to display, or `undefined` for no tooltip. Keep this function free of side effects; core calls it independently of mouse events.

For a feature, use `tooltip.target(() => feature)` as in the circle example above. For a signal, register the plot's hit rectangle and resolve the signal value from `position.clientX` and that rectangle's bounds. A container can use `hit` to identify a nested feature. Registration is removed automatically when the ref detaches.

In overlay composites, core queries these targets at the same pointer position across child tracks. SVG hit testing respects clipping, transforms, strokes, and `pointer-events`. Core displays at most one tooltip per child, stacked with a 4-unit gap, in reverse child order: the last-painted child appears first. Within a child, the first hit target that supplies an item wins. Each entry uses its module's existing `tooltipComponent` and current child context. A tooltip render failure is isolated to that entry.

Overlay tooltips are driven by registered targets; `show` does not replace the combined content. Keep the usual `show` and `hide` handlers for standalone and stack layouts. Custom renderers must register targets to contribute to an overlay tooltip. Registration does not route click or hover callbacks to covered children. First-party modules already register their tooltip targets.

Leaving the row, starting a pointer interaction, scrolling, losing window focus, or changing the child list or layout dismisses the combined tooltip. Detaching a target also clears displayed content. Moving the pointer queries the current targets again.

## TrackTooltipComponent

`TrackTooltipComponent<Item, Config>` receives required `item: Item` and `context: TrackRuntimeContext<Config>`. Return SVG content; the hook positions it within the browser. The context shape is specified with [instance callbacks](useInteraction.md#instance-callbacks). Each tooltip receives the track's current validated configuration. Supply meaningful labels and implement any keyboard behavior in the renderer.

```tsx
import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";

export const ValueTooltip: TrackTooltipComponent<number, { url: string }> = ({ item, context }) => (
  <g>
    <rect width={180} height={36} fill="white" stroke="#333" />
    <text x={6} y={14}>
      {context.base.title}
    </text>
    <text x={6} y={29}>
      Value: {item}
    </text>
  </g>
);
```

For the `HoverPoint` example above, assign this component as `tooltipComponent` on a module defined with `defineTrackModule<number>()`. `Item` and `Config` are TypeScript contracts; the hook does not validate the item at runtime. `show` and `hide` may be different function objects on later renders.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
