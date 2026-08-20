# Ticket 01: Add shared row-layout utilities

**Status:** Complete
**Requirements:** GitHub issue #120 and the approved design conversation
**Blocked by:** None. GitHub issue #121 is complete.

## Outcome

Row-based tracks can share one public layout contract that keeps packed row count, full row-slot height, and total track height synchronized. The shared base settings show coordinated Height and Row height fields for tracks that opt in with `config.rowHeight`.

## Scope

- Add the public row-layout contract under `packages/tracks/src/shared/layout` and export it from `@weng-lab/genomebrowser-tracks/shared`.
- Standardize opt-in on a finite numeric `config.rowHeight` at or above one internal shared minimum of 1 pixel. Do not expose a minimum option in the public hook.
- Provide centralized type detection and pure conversions among row count, row height, and total track height.
- Add a shared React hook that preserves configured row height when renderer packing changes row count and returns row-slot geometry for rendering.
- Make `TrackBaseSettings` show Height and Row height beside each other when the active track has valid row-layout config. Either edit must atomically update `base.height` and `config.rowHeight` while preserving the derived row count.
- Migrate the existing auto-height BigBed squish and transcript row renderers to the shared contract, including validated `rowHeight` config defaults that preserve their current 12-pixel row behavior.
- Document the public contract and update affected track documentation.

## Acceptance Criteria

- [x] `@weng-lab/genomebrowser-tracks/shared` publicly exports a row-layout config type, centralized runtime type guard, pure row count/row height/track height conversions, and a shared row-layout hook.
- [x] The contract defines row height as the complete vertical slot. A renderer may reduce its drawable content within that slot without changing total height or row count.
- [x] Total height equals `max(1, rowCount) * rowHeight`; row count is runtime layout data and is not persisted in track config.
- [x] The hook has no public minimum-row-height option. The implementation consistently rejects invalid, non-finite, or sub-minimum row heights instead of silently rendering a value different from `config.rowHeight`.
- [x] When viewport or data changes produce a different packed row count, migrated renderers preserve configured row height and synchronize total track height.
- [x] For a valid row-layout track, `TrackBaseSettings` renders Height and Row height inputs together. Changing Height derives Row height; changing Row height derives Height. Both paths use one atomic `updateTrack` call and preserve the current derived row count.
- [x] Tracks without valid `config.rowHeight` retain the existing Height-only settings behavior.
- [x] BigBed squish and transcript packed/squish displays use the shared utility without changing their horizontal packing responsibility or visible 12-pixel default row slots.
- [x] Focused tests cover the conversion invariant, capability detection, renderer row-count synchronization, coordinated settings edits, and unchanged Height-only behavior.
- [x] Public package documentation explains opt-in, slot versus content height, settings behavior, and viewport repacking using installable public imports.

## Verification

Run the directly affected tracks tests and the package's required typecheck. Add one focused regression path for each distinct public behavior only where existing coverage cannot establish it. Do not run the development server.

## Starting Points

- `packages/tracks/src/shared/layout/index.ts`: existing public `packRows` utility.
- `packages/tracks/src/shared/settings/trackBaseSettings.tsx`: shared Height field.
- `packages/tracks/src/bigbed/render.tsx`: squish renderer using core `useAutoTrackHeight`.
- `packages/tracks/src/transcript/render.tsx`: packed rows using core `useAutoTrackHeight`.
- `packages/core/src/browser/track-row/useAutoTrackHeight.ts`: current synchronization behavior and its 30-pixel minimum, which must not leak into the new exact row-layout invariant.
- `packages/tracks/test/shared/layout.test.ts` and `packages/tracks/test/settings/trackBaseSettings.test.tsx`: nearby test conventions.
- `packages/tracks/docs/shared.md`: public shared-utility documentation.

## Constraints

- Keep horizontal grouping and packing owned by each renderer. `packRows` remains a separate pure concern.
- Do not persist viewport-dependent row count or add a runtime row-count registry.
- Do not silently clamp row height because settings must observe the same value rendering uses.
- Use the atomic track updater established by issue #121.
- Keep the abstraction in the tracks package. Core continues to own browser track state and height mutation.
- Follow repository React quality guidance. Effects may synchronize with browser-owned track state but must not duplicate derivable local state.

## Out of Scope

- A configurable per-track minimum row height.
- Shared horizontal packing algorithms beyond the existing `packRows` utility.
- Migrating BulkBed's fixed-total-height dataset bands. Its gap behavior is useful precedent for content sizing inside a row slot, but changing its sizing policy is separate work.
- Compatibility aliases for `useAutoTrackHeight` or older APIs.

## Amendments

### A001 - Use BulkBed instead of BigBed

- **Supersedes:** The Scope item and acceptance criteria that migrate BigBed squish to the shared row-layout contract, the Out of Scope item excluding BulkBed migration, and any implementation that adds `rowHeight` to BigBed or changes BigBed dense behavior.
- **Replacement:** Migrate BulkBed and Transcript as the first consumers. BulkBed stores full slot height in `config.rowHeight`, uses its dataset count as runtime row count, synchronizes total height through the shared hook, and treats `gap` as drawable content spacing inside each slot without adding to total track height. Revert all ticket-introduced BigBed config, renderer, test, and documentation changes so its existing dense and squish behavior remains unchanged. Add one BulkBed track to the standalone app using existing repository-approved BigBed URLs, including at least two datasets so row resizing can be tested manually, and include it in the app defaults. Update focused tests and package docs for this replacement behavior.
- **Reason:** BulkBed is the issue's intended row-based consumer and has one consistent display. BigBed has dense and squish displays with incompatible sizing policies under one structural `config.rowHeight` opt-in.

### A002 - Migrate BigBed as a whole-track row layout

- **Supersedes:** A001's instruction to revert all BigBed row-layout changes and defer BigBed migration.
- **Replacement:** Migrate BigBed in addition to BulkBed and Transcript. Add the standard `config.rowHeight` opt-in with the shared 12-pixel default. Both BigBed displays must honor the contract: dense is a one-row layout whose content stretches within that slot, and squish uses its packed row count. Change BigBed's default height from 60 pixels to 12 pixels so the declared default matches dense's one-row layout. Update tests and docs for this intentional visible default change.
- **Reason:** The user approved applying the shared row-layout model to the whole BigBed track, including the dense default-height change.
