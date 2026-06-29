# Track Module vNext Spec

The new track module system should make the module definition the main authoring seam: a track author provides a `type`, one Zod schema for module-specific `config`, a `fetch` function, and renderers. The browser stores a full `TrackInstance`, identified by top-level `type` and split into browser-owned `base`, module-owned `config`, and optional instance-owned `interaction`, while module fetch/render code receives only the pieces it naturally needs.

- `TrackInstance = { type, base, config, interaction? }`.
- `base` is browser-owned state: `id`, `title`, `display`, `height`, and `color`.
- `config` is only the module-defined fields from the author’s Zod schema.
- Interaction callbacks live on the track instance; renderers access them through `useInteraction<T>()`.
- `fetch` receives `{ config, region }` and returns `Promise<Data>`; empty data should be represented by the data type’s zero value, while failures should throw.
- Renderers receive `{ id, config, color, data, region, width, height }`, not the full track instance.
- `display` is browser-owned and selects the renderer; it should be validated against the module’s render keys.
- Public exports should stay small: `defineTrackModule`, `TrackInstance`, `TrackFetch`, `TrackFetchContext`, `TrackRenderer`, and `TrackRendererProps` are likely enough for now.
- `create` accepts partial/defaultable input and returns a full validated `TrackInstance`.

## Todo

- Decide final tooltip behavior beyond the scaffolded `tooltip` interaction field.
- Decide whether browser-level default interaction policy is needed in addition to instance-owned callbacks.
- Wire `TrackInteractionProvider` into the future browser render path.
- Add focused tests for defaults, render key typing, fetch signatures, settings, and interaction validation.
