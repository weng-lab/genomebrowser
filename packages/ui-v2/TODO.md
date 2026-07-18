# UI v2 Beta Readiness Backlog

This backlog targets a first externally consumable beta of `@weng-lab/genomebrowser-ui-v2`.
P0 items block that beta. P1 items are beta-quality or high-value work that may be completed
during the beta only when the limitation is explicit. P2 items are post-beta follow-up.

## Beta exit criteria

- [ ] Every P0 item is complete, or has an explicit owner, rationale, and time-bounded beta waiver.
- [ ] A clean checkout passes the UI v2 test, typecheck, lint, format, and build gates, and an
      install-from-tarball smoke test exercises both documented package entry points and the CLI.
- [ ] Automated tests protect draft isolation, default initialization, Cancel/dismissal, Clear,
      Reset, limits, ordered Submit, failure atomicity, and preservation of non-catalog tracks.
- [ ] Publishable metadata and licensing are settled, and a consumable beta of the v2 dependency
      is available.
- [ ] Package docs describe the shipped API and known beta limitations without relying on
      repository-only files; the broader legacy migration disposition may remain P1.

## P0: beta blockers

- [x] **[Behavior contract] Reserve catalog-qualified track IDs for TrackSelect ownership.**
      TrackSelect intentionally classifies store tracks by `${catalogId}::${trackId}` ID alone.
      Hosts must not assign an ID reserved by a supplied catalog to a fixed or otherwise
      non-catalog track. Doing so makes that track catalog-owned, so initialization or Submit may
      reuse or remove it. This keeps provenance deterministic without adding runtime metadata for
      unsupported programmatic collisions. Regression tests cover initialization, Clear, and
      Submit. Evidence: `src/TrackSelect/catalog/catalogStore.ts`,
      `src/TrackSelect/catalog/catalogRows.ts`, `test/trackSelectWorkflow.test.tsx`,
      `docs/trackSelect.md`, and v2's unique-ID boundary in
      `packages/v2/src/browser/state/trackStore.ts`.

- [x] **[Known bug / state ownership] Make TrackSelect initialization identity explicit.**
      Initialization is scoped to the mounted `TrackSelect` and its current combination of store,
      catalogs, defaults, and limit. Changing that combination initializes again; ordinary store
      updates do not. A remount starts a new lifetime. Tests distinguish `undefined` from `[]` and
      cover changed defaults, remounts, and two isolated stores. Evidence:
      `src/TrackSelect/TrackSelect.tsx`, `test/trackSelectWorkflow.test.tsx`,
      `docs/trackSelect.md`, and `docs/ui-v2/concepts.md`.

- [ ] **[Tests] Close the remaining TrackSelect component-boundary gaps.** The current workflow
      suite covers draft isolation, navigation, ordering, limits, Clear, Reset, Cancel, successful
      Submit, rejected `setTracks`, atomicity, and preservation of external tracks through the
      session/store boundary. Add focused coverage for an open dialog with real content,
      remove-from-tree, close/backdrop/Escape dismissal, rendered errors, creation failure, edited
      existing instances, and the single-catalog path. Keep low-value MUI gesture duplication in
      the manual harness as directed by the maintainer testing guide. Evidence:
      `test/trackSelectWorkflow.test.tsx`, `src/TrackSelect/session/useTrackSelectState.ts`,
      `src/TrackSelect/layout/trackSelectContent.tsx`, and `docs/ui-v2/testing.md`.

- [ ] **[Release] Make the package publishable and settle release ownership.** Replace the
      placeholder `0.0.0`/`private: true` state with an intentional beta version and public publish
      metadata, choose and include a license, and verify that `workspace:*` resolves to a released
      v2 dependency. **Cross-package prerequisite:** `@weng-lab/genomebrowser-v2` is also currently
      private at `0.0.0`; UI v2 publication depends on a consumable compatible v2 beta, but v2
      release implementation remains owned by `packages/v2`. Evidence: `package.json`,
      `packages/v2/package.json`, and legacy release metadata in `packages/ui/package.json`.

- [ ] **[Release / CLI] Test the built tarball rather than only workspace source.** In a temporary
      consumer, install a freshly packed artifact, import `@weng-lab/genomebrowser-ui-v2` and
      `@weng-lab/genomebrowser-ui-v2/cli`, run `trackselect --help`, and generate a schema from a
      `trackselect.config.ts`. Verify the bin is executable, source maps and declarations resolve,
      peer dependencies stay external, and no workspace-internal import is required. The current
      dry-run pack exposes 47 files but has no installed-consumer test. Evidence: `package.json`,
      `vite.config.ts`, `src/trackselect.ts`, `src/cli.ts`, and `src/lib.ts`.

- [x] **[Release / MUI] Make MUI X license setup host-owned.** UI v2 no longer reads build-time
      license environment values or calls `LicenseInfo.setLicenseKey`. Consuming applications must
      configure their own MUI X Premium license before rendering UI v2. Evidence: `src/lib.ts`,
      `vite.config.ts`, `docs/README.md`, and `docs/ui-v2/concepts.md`.

- [ ] **[Release hygiene] Restore a green formatting gate.** `format:check` currently fails on
      checked source, tests, fixtures, and generated schemas, so it cannot serve as a beta gate.
      Apply the repository formatter, review generated-data diffs, and keep the check in the
      release command set. Evidence: `package.json`, `README.md`, `docs/ui-v2/testing.md`,
      `schemas/trackSelectCatalog.schema.json`, `src/TrackSelect/catalog/catalogSelection.ts`,
      `src/TrackSelect/schema/catalogSchema.ts`, and `test/`.

## P1: beta-quality and high-value

- [x] **[Feature / legacy parity candidate] Separate initial selection, Reset defaults, and
      committed-selection notification.** The narrow, storage-agnostic persistence API seam is
      shipped. `initialTrackIds` restores an ordered initial catalog selection, while
      `defaultTrackIds` remains the product baseline and Reset target. Hosts can preserve the
      distinction between missing persisted state and an explicit persisted `[]` by passing
      `undefined` or `[]`, respectively. `onCommittedTrackIds` reports the complete ordered catalog
      selection only after a successful Submit; initialization, Cancel or dismissal, draft actions,
      and failed Submit do not report a commit. TrackSelect does not choose storage keys or call
      `localStorage` directly. The reusable payload parser, storage adapter, catalog reconciliation
      helper, and persistence controller remain proposed in
      `docs/ideas/trackSelectPersistence.md`. Evidence: `src/TrackSelect/TrackSelect.tsx`,
      `src/TrackSelect/session/useTrackSelectState.ts`, `test/trackSelectWorkflow.test.tsx`,
      `docs/trackSelect.md`, and `docs/ideas/trackSelectPersistence.md`.

- [ ] **[Feature / legacy parity candidate] Provide or reject a narrow interaction-callback seam.**
      Catalog JSON is correctly data-only, but UI v2 calls `createTrackFromEntry` without the
      optional v2 interaction argument, so catalog-created tracks cannot receive host-specific
      `onClick`, `onHover`, or `onLeave` callbacks. Choose between a catalog-entry-to-interaction
      resolver prop or an explicit documented post-creation integration pattern; do not restore
      legacy's application-specific intersection type. Evidence:
      `src/TrackSelect/catalog/catalogStore.ts`, `packages/v2/src/modules/registry.ts`,
      `docs/v2/adr/0007-track-configs-hold-instance-state-modules-hold-stable-behavior.md`, and
      legacy `packages/ui/src/TrackSelect/trackContext.ts`.

- [ ] **[Accessibility / responsive UI] Establish a keyboard and small-screen acceptance pass.**
      Give the view selector an accessible name, verify focus entry/return and nested confirmation
      dialogs, exercise keyboard grid/tree selection and removal, and ensure the two fixed-height
      500 px panels plus action bar remain usable at phone widths and browser zoom. Add automated
      assertions for names and dialog semantics, with a short documented manual matrix for MUI
      behavior that is impractical to automate. Evidence:
      `src/TrackSelect/layout/trackSelectToolbar.tsx`,
      `src/TrackSelect/layout/trackSelectDialog.tsx`,
      `src/TrackSelect/layout/trackSelectBody.tsx`,
      `src/TrackSelect/selectedTracksTree/selectedTreeItem.tsx`, and
      `src/TrackSelect/trackSelectConstants.ts`.

- [ ] **[Schema / CLI] Make catalog authoring artifacts deterministic and self-consistent.** Pick
      one canonical example-schema output, align `writeExampleTrackSelectJsonSchema.ts`, checked
      `test/schemas/schema.json`, and every fixture `$schema` path, and add drift validation for
      both checked schemas. Decide whether `schemas/trackSelectCatalog.schema.json` is a shipped
      public artifact or a repository-only built-in-module fixture; the current `files` list omits
      it. Add CLI config tests for empty modules, invalid/empty `schema.id` and `schema.outFile`,
      load failures, and useful exit messages. Evidence: `scripts/`, `schemas/`, `test/schemas/`,
      `test/catalogs/*.json`, `src/trackselect.ts`, and `package.json`.

- [ ] **[Known bug / validation] Reject ambiguous catalog and prop inputs before MUI sees them.**
      Enforce unique view IDs and column fields per view, decide whether repeated grouping fields
      and reserved metadata keys (`id`, `title`, `type`) are errors, and require `maxTracks` to be a
      positive finite integer. Error paths must name the catalog/view/field. Add tests for each
      accepted/rejected case. Evidence: `src/TrackSelect/schema/catalogSchema.ts`,
      `src/TrackSelect/schema/validateJson.ts`, `src/TrackSelect/catalog/catalogColumns.tsx`, and
      `src/TrackSelect/TrackSelect.tsx`.

- [ ] **[Behavior decision] Specify what happens when catalog definitions change around existing
      tracks.** Reconciliation currently reuses an existing selected instance by ID, preserving
      user edits but also ignoring changed catalog type/config/base values. Choose and test either
      “existing instance wins until removed” or an explicit refresh/recreate action; do not
      silently overwrite user-edited config on an unrelated render. Evidence:
      `src/TrackSelect/catalog/catalogStore.ts`, `docs/trackSelect.md`, and
      `packages/v2/src/browser/state/trackStore.ts`.

- [ ] **[Error UX decision] Define the dynamic-catalog failure boundary.** Catalog and default
      validation currently throw during render/layout initialization. Choose the smallest useful
      contract: document throws as configuration errors for static catalogs, or add an error
      callback/rendered state for applications loading catalogs dynamically. In either case, test
      that invalid input never partially mutates the track store. Evidence:
      `src/TrackSelect/TrackSelect.tsx`, `src/TrackSelect/schema/validateJson.ts`, and
      `docs/trackSelect.md`.

- [ ] **[Legacy parity decision / docs] Publish a bounded migration disposition for legacy UI.**
      State whether bundled assembly catalogs, MOHD/biosample-specific grouping and tree renderers,
      custom view-selector components, `onCancel`, and the exported TF Peaks track are ports,
      replacements, or non-goals. Likely replacements must point to current catalog views,
      `columnOverrides`/`withValueMarkers`, v2 modules, and host-owned catalogs; add a narrow render
      slot only if a real migrated catalog cannot preserve required meaning. Evidence:
      `packages/ui/src/TrackSelect/Folders/index.ts`,
      `packages/ui/src/TrackSelect/Folders/types.ts`,
      `packages/ui/src/TrackSelect/Custom/TfPeaks.tsx`, `docs/ui-v2/concepts.md`, and
      `docs/ideas/trackPrimitives.md`.

- [ ] **[Docs] Reconcile shipped docs after the API decisions above.** Fix the Reset confirmation,
      which always says “current track store” even when `defaultTrackIds` is the target; document
      license setup, error behavior, persistence status, and legacy migration. Keep the maintainer
      testing guide aligned with the implemented atomic `setTracks` boundary. Evidence:
      `src/TrackSelect/layout/trackSelectActionBar.tsx`, `docs/trackSelect.md`,
      `docs/gettingStarted.md`, `docs/ui-v2/testing.md`, and `docs/ui-v2/concepts.md`.

## P2: post-beta and follow-up

- [ ] **[Refactor / performance] Measure the real large-catalog interaction path before optimizing.**
      Use `test/catalogs/human-biosamples.json` (5,845 tracks) to baseline validation, open/view
      switching, selection, filtering, and selected-tree updates. If interaction latency is a
      problem, first localize confirmation/limit/error state and reduce broad context-driven grid
      rerenders/new selection sets; only then memoize a measured expensive computation. Evidence:
      `src/TrackSelect/session/trackSelectContext.tsx`,
      `src/TrackSelect/session/useTrackSelectState.ts`,
      `src/TrackSelect/catalog/catalogGrid.tsx`, and
      `src/TrackSelect/selectedTracksTree/selectedTracksTree.tsx`.

- [ ] **[API polish] Improve TypeScript authoring without widening the runtime surface.** Decide
      whether to export a supported catalog input/result type or a typed catalog-definition helper,
      make collection props readonly where mutation is not supported, and consider a
      TrackSelect-specific name for the broad `validateJson` export. Keep internal schema and MUI
      implementation types private unless downstream code has a demonstrated use. Evidence:
      `src/lib.ts`, `src/TrackSelect/TrackSelect.tsx`,
      `src/TrackSelect/schema/catalogSchema.ts`, and `src/TrackSelect/schema/validateJson.ts`.

- [ ] **[Persistence follow-up] Defer async/server synchronization and full browser-session
      persistence until synchronous ordered catalog-selection persistence is proven.** Region,
      fixed tracks, fetched data, cross-tab synchronization, and server profiles remain explicit
      non-goals unless a separate design is approved. Evidence:
      `docs/ideas/track-select-persistence.md` and `docs/ideas/browser-sessions.md`.
