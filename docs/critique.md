For general usage, docs are most helpful when they encode intent and workflows, not API inventory. I can inspect types for props, but types don’t tell me the “happy path” or the package author’s intended boundaries.
What I’d want most:

- Mental model first
- Browser store owns viewport/layout/highlights.
- Track store owns track instances/order/module registry.
- Modules own validation/fetch/render/settings.
- App code should compose these, not reach into internals.
- Canonical app-shell example
  Not just minimal render, but a small realistic setup:
- create stores
- region display
- search calls setRegion
- zoom buttons call zoom
- highlight add/remove
- TrackSelect integration
- Browser render
- Common recipes
- Add initial tracks.
- Add tracks later.
- Remove/reorder tracks.
- Update a track config.
- Add highlights.
- Sync trackWidth to a responsive container.
- Handle mutation failures.
- Behavioral guarantees
- Does addHighlight replace duplicates, ignore them, or throw?
- Are track mutation results always { ok, error? }?
- Does zoom clamp to chromosome bounds or only start ≥ 0?
- Are track fetches cancelled/deduped?
- What is safe to keep stable vs recreate?
- Sharp edges
- Track IDs must be unique.
- Register all modules used by catalogs.
- Keep catalog arrays stable.
- Fixed trackWidth can desync coordinates in responsive layouts.
- gs:// support if relevant.
- SSR/Next.js caveats if any.
- Decision guidance
- When to use only genomebrowser-v2 vs also genomebrowser-ui-v2.
- When to write a custom module vs adapt a catalog.
- When app state should wrap stores vs use browser stores directly.

Where API layout pays off:

- public surface overview: “these are the stable things you should use”
- relationships between stores/modules/components
- naming conventions and lifecycle expectations
- behavioral notes not visible in types
  My preferred split would be:
- 20% API map: concise public surface, stable exports, links to generated docs if available.
- 50% recipes: realistic examples.
- 30% behavior/sharp edges: what types don’t say.
  So yes, include an API layout, but keep it intentionally shallow and pair it with “why/when” notes.
