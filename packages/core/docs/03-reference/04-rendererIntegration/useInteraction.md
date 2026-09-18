# useInteraction

Call a `useInteraction` handler with the clicked or hovered item. Core then calls the track instance's application callback with that item and the track's current context.

`useInteraction<Item>(): TrackRendererInteraction<Item> | null` returns the handlers for the current renderer.

```tsx
import { useInteraction } from "@weng-lab/genomebrowser";

type Item = { start: number; end: number };
export function ClickableInterval({ item }: { item: Item }) {
  const interaction = useInteraction<Item>();
  return <rect width={20} height={10} onClick={() => interaction?.onClick?.(item)} />;
}
```

The returned object can contain `onClick`, `onHover`, and `onLeave`, each accepting one `Item` and returning `void`. The hook does not attach DOM events or decide what item they represent. Without a provider or configured interaction it returns `null`; individual callbacks can also be absent. This example wires pointer clicks only and does not provide a keyboard control.

## Instance callbacks

`TrackInteraction<Item, Config>` has optional `onClick`, `onHover`, and `onLeave` callbacks. Each is a `TrackInteractionCallback<Item, Config>` with signature `(item: Item, context: TrackRuntimeContext<Config>) => void`.

`TrackRuntimeContext<Config>` contains readonly `type`, `base`, and parsed `config`. It is derived from the current validated instance. It is not persisted state and contains no collection metadata or source field. Object config and base are shallow readonly views.

The renderer decides which item to pass and when to emit each event. Hover handlers can run frequently, so avoid expensive work in them.

The item type is supplied by the renderer and is not checked at runtime. Define the module with `defineTrackModule<Item>()` so its `create(input, interaction)` callbacks and tooltip use the same item type. Pass callbacks as the second `create` argument, and use [track-store patches](../01-browserSetup/trackStore.md#trackupdate-and-trackbaseupdate) to replace them later.

| Context field | Type                                               | Description                                              |
| ------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `type`        | `string`                                           | Module identifier.                                       |
| `base`        | `Readonly<TrackBase>`                              | Current resolved ID, title, display, height, and color.  |
| `config`      | `Readonly<Config>` for objects; otherwise `Config` | Parsed configuration. Nested values are not deep-frozen. |

`Item` and `Config` default to `unknown` in `TrackInteraction`. `Config` also defaults to `unknown` in `TrackInteractionCallback` and `TrackRuntimeContext`. The hook does not catch callback exceptions.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
