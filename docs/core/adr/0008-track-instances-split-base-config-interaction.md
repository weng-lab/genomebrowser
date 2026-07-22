# Track instances split browser base, module config, and interaction

v2 track runtime state is stored as `TrackInstance = { type, base, config, interaction? }`. Module `create` accepts browser-owned base fields at the top level, module-owned fields under `config`, and optional interaction callbacks as a second argument:

```ts
module.create(
  {
    id: "signal",
    title: "Signal",
    height: 80,
    config: { url: "YOUR_URL_HERE" },
  },
  {
    onClick: (item, context) => {
      console.log(item, context.config.url, context.base.color);
    },
  },
);
```

This separates browser-owned state from module-owned config and instance-owned callbacks, keeps fetch/render/settings APIs narrow, and preserves module-owned stable behavior such as tooltip components on the module instead of the track instance.

Amendment: this ADR originally described a flat public `create` input. The current API keeps the nested runtime ownership model but makes that ownership explicit at the public boundary: JSON-serializable create input uses top-level base fields plus `config`, while code-only interaction callbacks are passed separately.

Application callbacks receive the semantic item and a current shallow read-only runtime view:

```ts
type TrackRuntimeContext<Config> = Readonly<{
  type: string;
  base: Readonly<TrackBase>;
  config: Readonly<Config>;
}>;

type TrackInteraction<Item, Config> = {
  onClick?: (item: Item, context: TrackRuntimeContext<Config>) => void;
  onHover?: (item: Item, context: TrackRuntimeContext<Config>) => void;
  onLeave?: (item: Item, context: TrackRuntimeContext<Config>) => void;
};
```

The browser binds the current context before exposing callbacks to renderers, so `useInteraction<Item>()` remains item-only. Module tooltips receive `{ item, context }`, not a separate config prop. This context is derived at render time and is not persisted, deep-frozen, or extended with TrackSelect catalog metadata.
