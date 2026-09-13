# useInteraction

`useInteraction<Item>(): TrackRendererInteraction<Item> | null` reads item-only callbacks for the current renderer. The browser supplies them from the instance's [interaction callbacks](useInteraction.md#instance-callbacks), with runtime context already bound.

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

Renderers choose the semantic item and invoke [useInteraction](useInteraction.md#useinteraction) handlers. The browser binds the runtime context, so `TrackRendererInteraction<Item>` exposes those same optional callback names with item-only signatures `(item: Item) => void`. Callback frequency and which events are emitted depend on the renderer; keep frequent hover handlers lightweight.

The item type is supplied by the renderer and is not checked at runtime. Define the module with `defineTrackModule<Item>()` so its `create(input, interaction)` callbacks and tooltip use the same item type. Pass callbacks as the second `create` argument, and use [track-store patches](../browserSetup/trackStore.md#trackupdate-and-trackbaseupdate) to replace them later. Updated callbacks receive runtime context from the current validated instance.

| Context field | Type                                               | Description                                              |
| ------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `type`        | `string`                                           | Module identifier.                                       |
| `base`        | `Readonly<TrackBase>`                              | Current resolved ID, title, display, height, and color.  |
| `config`      | `Readonly<Config>` for objects; otherwise `Config` | Parsed configuration. Nested values are not deep-frozen. |

`TrackInteraction<Item = unknown, Config = unknown>` and `TrackInteractionCallback<Item, Config = unknown>` accept runtime context; `TrackRendererInteraction<Item>` accepts only the item. `TrackRuntimeContext<Config = unknown>` supplies the context shape above. Callback exceptions are not caught by the hook.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
