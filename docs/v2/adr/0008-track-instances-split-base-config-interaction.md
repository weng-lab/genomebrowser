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
    onClick: (item) => {
      console.log(item);
    },
  },
);
```

This separates browser-owned state from module-owned config and instance-owned callbacks, keeps fetch/render/settings APIs narrow, and preserves module-owned stable behavior such as tooltip components on the module instead of the track instance.

Amendment: this ADR originally described a flat public `create` input. The current API keeps the nested runtime ownership model but makes that ownership explicit at the public boundary: JSON-serializable create input uses top-level base fields plus `config`, while code-only interaction callbacks are passed separately.
