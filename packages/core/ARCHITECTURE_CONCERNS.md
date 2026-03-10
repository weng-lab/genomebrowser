# Core Architecture Concerns

This note is intentionally high level. It only covers current areas of concern, oddities, and likely improvement targets in `packages/core`.

## Overall Read

The architecture is moving in a good direction: the browser is becoming more like a dumb shell, and tracks are becoming more like modules/plugins.

The main remaining issues are not broad chaos, but a handful of shared runtime pieces that still know too much about specific track types.

## 1. Generic Runtime Still Contains Track-Specific Logic

Some of the shared browser/runtime code still has special knowledge of certain tracks. This weakens the plugin model.

- `src/hooks/useDataFetcher.ts`
  - Still switches on concrete track `type` values to build fetch/cache keys.
  - Still hardcodes named Apollo query hooks into the generic fetch path.
  - This means the fetch layer is only partially pluginized.

- `src/components/tracks/frame/Margin.tsx`
  - Still casts tracks to `BigWigTrack` and reads `range` / `customRange` directly.
  - This means the shared frame UI still knows about one specific track's internals.

- `src/components/modal/shared/download.tsx`
  - Still branches on `track.type` for download behavior.
  - This is another place where generic UI knows too much about concrete tracks.

Why this is weird:

- The station should not need to know ship-specific internals.
- The browser should resolve behavior from `TrackDefinition`, not from hardcoded `if`/`switch` logic.

## 2. Renderer-Side State Mutation Blurs Boundaries

Some renderer-side code writes back into shared track state.

- `src/components/tracks/bigwig/rework.tsx`
  - Computes a range from visible data, then writes it back into the track store.

- `src/hooks/useRowHeight.ts`
  - Computes a height from row count, then rewrites the track height in shared state.

Why this is weird:

- Renderers should ideally render, not mutate core runtime state.
- This makes data flow harder to follow.
- It increases the chance of hidden coupling, rerender loops, and confusing behavior.

This likely reflects older architecture where track state, layout state, and view-derived state were less clearly separated.

## 3. Some Shared Seams Are Still Too Loose

The new model is clearer now:

- `TrackDefinition` = plugin/module behavior
- `TrackInstance` = concrete runtime track object

But some of the typing around the shared seams is still loose.

- `src/components/tracks/types.ts`
  - `TrackDefinition.renderers` still uses broad `React.ComponentType<any>` typing.

- `src/store/BrowserContext.tsx`
  - Context hooks still return values through `as any` casts.

Why this is weird:

- The architecture is conceptually cleaner than the types currently express.
- Loose typing at the shell/runtime boundary makes refactors more brittle.
- AI and contributors lose signal right where they most need it.

## 4. The Public Surface Is Still Too Mixed Together

- `src/lib.ts`
  - Still acts like a catch-all barrel.
  - It mixes browser exports, track factories, renderer data types, store factories, hooks, helpers, and misc utilities.

Why this is weird:

- It makes the public API less intentional.
- It increases discoverability cost because too many unrelated concepts are exposed from one place.
- It feels like an artifact of growth rather than a cleanly designed entry surface.

This is not necessarily urgent, but it is a clarity issue.

## 5. Some Modules Still Feel Like Legacy or Partial Holdovers

Some track-related areas do not feel fully aligned with the new plugin-oriented direction.

- `src/components/tracks/custom/types.ts`
  - Still reads like an older config-driven abstraction.
  - It does not fully match the newer `TrackDefinition` + `TrackInstance` mental model.

- `src/components/tracks/ldtrack`
- `src/components/tracks/manhattan`
  - These feel more like special cases or partial systems than fully normalized plugin modules.

- `src/components/tracks/bigwig/rework.tsx`
  - The filename itself signals architectural transition rather than a settled design.

Why this is weird:

- These areas make the codebase feel mid-migration.
- They are harder to reason about because they do not fully fit the cleaner shape the rest of the system is moving toward.

## 6. Legacy Store Exports Still Exist

Some stores still expose singleton-style legacy exports.

- `src/store/modalStore.ts`
- likely similar patterns in other UI stores

Why this is weird:

- The browser is now designed around per-instance stores.
- Legacy singleton exports pull in the opposite direction.
- They make the system feel like it still has one foot in the old global model.

## 7. Contributor and AI Friction Still Comes From Hidden Exceptions

The broad architecture is now understandable, but comprehension still drops when a contributor discovers that some shared pieces are not actually generic.

Examples:

- generic fetch path still knows specific tracks
- generic frame UI still knows BigWig range behavior
- generic download UI still knows which tracks support which downloads
- renderer-side code still mutates shared runtime state

Why this matters:

- it breaks the mental model that tracks are self-contained modules
- it creates “surprise architecture” where behavior is split across too many unrelated places
- it makes safe edits slower for both people and AI systems

## Main Improvement Direction

The main improvement direction is simple:

- move more behavior onto `TrackDefinition`
- remove hardcoded track-type branches from generic runtime code
- stop pushing view-derived state back into shared track state when possible
- tighten shared types at the runtime seams
- keep the browser shell dumb and the track modules self-contained

## Short Version

What is weird right now:

- generic browser/runtime code still contains concrete track assumptions
- some renderers mutate shared state
- some types are looser than the architecture now deserves
- the public barrel is still too mixed
- a few modules still feel like artifacts of the old design

What this means:

- the architecture is on the right path
- the biggest remaining work is removing leftover exceptions so the plugin model is consistently true everywhere
