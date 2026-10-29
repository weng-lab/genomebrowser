# Project glossary

Prefer these terms in issues, docs, and discussion. Preserve exact API names in code talk. Suggest additions when a recurring project concept needs a shared name; prefer nesting under an existing entry.

## Browser and coordinates

**Browser instance** - One mounted `GenomeBrowser` with its own rendering and track resources. Instances may share application-owned stores. The **host application** embeds the browser. **Browser context** (`useGenomeBrowser()`) gives hosted UI access to that instance's stores.

**Browser store / track store** - Application-owned stores: assembly, viewport, highlights, and settings versus modules, instances, order, and config. A **session** is the app's saved browsing setup, not either store object.

**Viewport** - Visible genomic span. **Zoom** changes that span; **scale** changes drawing/control size. **Render region** is the span prepared for drawing, including **overscan** beyond the viewport for panning.

**Coordinate space** - Genomic bases, logical SVG units, or screen pixels; say which. Internal regions are zero-based half-open ([ADR 0006](adr/0006-internal-zero-based-coordinates.md)). **Display coordinates** are one-based inclusive text people type (UCSC-style); convert only at human boundaries.

## Tracks

**Track / track instance** - One configured visualization (runtime object with id, type, config, optional interactions). **Pinned** means excluded from ordinary drag reorder, not sticky scroll.

**Track module** - Reusable type implementation (fetcher, renderers, validation, optional settings/tooltips). The **module registry** maps type ids to modules (the store's registration map, not an ad hoc global).

**Display mode** - Module drawing choice (`base.display`). Distinct from a **collection view** (catalog organization).

**Base-pair detail** - Per-base glyphs; gated by visible-span cutoff and width via `useBasePairDetail`.

**Track configuration** - `base` (id, title, color, height, display) plus module `config`. **Source ownership** (`host` | `user`) records who controls the data source; core does not enforce which fields are editable.

**Track anatomy** - **Frame** (core chrome), **margin** (color/controls/drag), **plot** (data area), **overlay** (`TrackOverlay`, viewport-anchored).

**Row layout** - Packing items into rows inside a track; **row height** vs **track height**; distinct from track order.

## Collections and fetching

**Track collection** - Catalog of configured tracks for one assembly. Entries are not loaded until selected. **Qualified track id** (`collection::entry`) identifies selection in `TrackSelect`.

**Render demand** - Region and width core asks a fetcher to satisfy. **Fetch-affecting config** is marked `fetchOnChange`.

**Track resources** - Reusable per-track values (readers, caches) retained between fetches; released when the track or hosting stores go away.

## Testing

**Render budget** - Exact allowed committed React renders for an interaction (inline snapshot via `@weng-lab/render-probe`). Higher fails; lower updates the snapshot.
