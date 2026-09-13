# useTooltip

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

Shows are scheduled on the next animation frame; a later call cancels a pending show from the same hook. Panning hides the tooltip, and a missing module tooltip component makes `show` a no-op. `hide` cancels a pending show and hides content owned by this hook. Unmounting performs the same cleanup. Calling the hook without the required browser/track contexts throws.

The browser places a tooltip corner 10 logical SVG units from the pointer on each axis and switches corners near edges. Oversized content can extend beyond the browser. Tooltip content does not intercept pointer events. The hook provides no keyboard trigger or accessible description relationship; supply meaningful content and any required accessible alternative in the track UI.

## TrackTooltipComponent

`TrackTooltipComponent<Item, Config>` receives required `item: Item` and `context: TrackRuntimeContext<Config>`. Return SVG content; the hook positions it within the browser. The context shape is specified with [instance callbacks](useInteraction.md#instance-callbacks). Later validated changes appear in later callback invocations and tooltip shows. Renderers and tooltip content own meaningful labels and any supported keyboard behavior; the module contract does not add it automatically.

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

For the `HoverPoint` example above, assign this component as `tooltipComponent` on a module defined with `defineTrackModule<number>()`. `Item` and `Config` are TypeScript contracts; the hook does not validate the item at runtime. `show` and `hide` have no stable-function-identity guarantee.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
