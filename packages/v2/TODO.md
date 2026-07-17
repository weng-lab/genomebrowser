# v2 Beta Readiness Backlog

This backlog targets a realistic first public beta of `@weng-lab/genomebrowser-v2`.
P0 items block publishing the beta. P1 items are expected for a credible beta or
provide high leverage immediately after it; a P1 deferral should be explicit.
P2 items are post-beta follow-up and are not commitments to legacy parity.

## Beta Exit Criteria

- All P0 items are complete, with regression tests for the request-settlement and
  coordinate bugs.
- A clean checkout passes type checking, tests, lint, and formatting, then builds,
  packs, and installs the exact tarball in a small React consumer without relying
  on workspace resolution or build-time secrets.
- The packed artifact has intentional exports, prerelease metadata, a license,
  self-contained user docs, and no credentials. Its documented built-in module
  inventory exactly matches its public exports.
- A DOM integration suite covers request settlement, settings/context-menu actions,
  error isolation, and two independent browser instances. Browser-level automation
  or a documented acceptance pass covers pointer capture and SVG coordinate behavior
  that jsdom cannot represent faithfully.
- There are no open known deadlocks, stale-data paths, credential leaks, or renderer
  and tooltip failures that can unmount the browser. Any deferred P1 accessibility
  or legacy-parity decision has an explicit owner and post-beta milestone.

## P0: Beta Blockers

- [ ] **[Known bug] Make request identity and settlement correct for track
      replacement and removal.** A same-ID replacement with a different module can
      reuse the old result because `createFetchSignature` and `createTrackFetchKeys`
      omit `track.type`. Removing the last track while its request is active can also
      leave `fetchingTrackIds` nonempty forever: the old effect is cancelled and the
      new zero-track path never clears it. Include module identity in the request key,
      make latest-request ownership explicit, clear removed/inactive request state,
      and add mounted-hook regressions for same-ID replacement, removal during fetch,
      stale completion, retained successful data, and zero tracks. Evidence:
      `packages/v2/src/modules/fetchOnChange.ts`,
      `packages/v2/src/browser/data/useTrackData.ts`,
      `packages/v2/src/browser/viewport/useRenderWindow.ts`,
      `packages/v2/test/data/fetchOnChange.test.ts`, and
      `packages/v2/test/stores/trackStore.test.ts`.

- [ ] **[Known bug / decision] Enforce one valid genomic-coordinate contract at
      every browser seam.** Object regions currently allow negative coordinates,
      overscan and pan commits can create negative starts, and fetchers forward those
      values. Choose the smallest beta contract: either (A) guarantee only a
      non-negative lower bound and document that chromosome ends are unknown, or (B)
      inject chromosome lengths and clamp both ends. In either case, preserve the
      visible-region alignment when overscan becomes asymmetric, reject non-finite
      values, and test parsing, selection, zoom, pan, render-window, and fetch input
      near coordinate zero. Evidence: `packages/v2/src/modules/utils/region.ts`,
      `packages/v2/src/browser/state/browserStore.ts`,
      `packages/v2/src/browser/viewport/usePanController.ts`,
      `packages/v2/src/browser/viewport/useRenderWindow.ts`, and
      `packages/v2/src/browser/viewport/SelectRegion.tsx`.

  > Need to clamp regions to common values so that the region doesn't go beyond a
  > chromosome's limit.

- [ ] **[Known bug] Reject invalid viewport geometry mutations.** Keep this
      separate from chromosome-bound policy: validate `setTrackWidth`, zoom factors,
      and any externally supplied dimensions so zero, negative, `NaN`, or infinite
      values cannot enter scale or viewport calculations. Add focused store and
      controller regressions. Evidence:
      `packages/v2/src/browser/state/browserStore.ts` and
      `packages/v2/src/browser/viewport/usePanController.ts`.

- [ ] **[Release/security decision] Remove Transcript's package-build credential
      coupling.** A published library must not require or embed the publisher's
      `SCREEN_API_KEY`. Choose either (A) a transcript-module factory with injected
      endpoint/auth or fetch behavior, keeping the convenience module only if it can
      work without a secret, or (B) move the SCREEN-specific module out of the public
      built-ins and document a custom-module recipe. Test missing credentials,
      authorization, HTTP failure, GraphQL errors, and successful response parsing;
      then remove the build-time `SCREEN_` environment contract from package docs,
      ambient types, and Vite config. Evidence:
      `packages/v2/src/tracks/transcript/fetch.ts`,
      `packages/v2/src/tracks/transcript/module.tsx`,
      `packages/v2/src/vite-env.d.ts`,
      `packages/v2/vite.config.ts`,
      `packages/v2/docs/troubleshooting.md`, and
      `docs/v2/tracks/transcript.md`.

- [ ] **[Release/API decision] Freeze an intentional beta export and built-in
      module surface.** Audit every root export and either document it as supported or
      stop exporting it before beta. In particular, resolve `caveModule` as either a
      tested, configurable, documented first-party module or an application/example
      recipe; it currently hard-codes Wenglab datasets and has no tests or settings.
      Resolve exported `DenseBigBed`/`SquishBigBed` by either removing them for beta or
      replacing their hard-coded `useTooltip({ type: "bigbed" })` coupling with the
      identity-independent primitive direction in `docs/ideas/trackPrimitives.md`.
      Also review browser-internal-looking exports such as
      `TrackInteractionProvider`, `createContextMenuStore`, and `useRegistry` rather
      than accidentally committing to them. Evidence: `packages/v2/src/lib.ts`,
      `packages/v2/src/tracks/bigbed/render.tsx`,
      `packages/v2/src/tracks/cave/fetch.ts`,
      `packages/v2/src/tracks/cave/module.tsx`,
      `packages/v2/docs/tracks.md`, and `docs/v2/tracks.md`.

- [ ] **[Release work] Produce and smoke-test a publishable artifact.** Set an
      actual prerelease version, remove `private` only when the gate is green, declare
      the license and include its text, and add the expected repository/support
      metadata. Add a repeatable release check that builds before packing, inspects
      package contents, installs the tarball in a non-workspace React app, type-checks
      public imports, and renders a minimal browser. Keep the declaration tree only if
      it is intentional; the current dry-run pack contains declarations for internal
      modules even though only `.` is exported. Wire typecheck/test/lint/format/build/
      pack-smoke into CI or one root release command, and make it fail on warnings if
      that is the chosen policy. Evidence: `packages/v2/package.json`,
      `packages/v2/vite.config.ts`, `packages/v2/tsconfig.app.json`,
      `packages/core/LICENSE`, and root `package.json`. The audit's static checks found
      10 files failing `format:check` and two lint warnings in type-contract tests;
      `npm pack --dry-run --json` included docs and runtime/type entries but no license.

- [ ] **[Docs/release work] Make shipped docs describe the finalized package, not
      an evolving workspace.** After the API and built-in decisions above, replace
      alpha/evolving language, document every supported root export at an appropriate
      level, give each retained built-in its complete config/default/fetch/interaction
      contract, and state the explicit legacy replacements and non-goals. Keep package
      docs self-contained and concise; keep maintainer mechanics and ADR rationale in
      `docs/v2/`. Reconcile both doc sets against the implementation and add link/code
      example checks where practical. Evidence: `packages/v2/README.md`,
      `packages/v2/docs/README.md`, `packages/v2/docs/tracks.md`,
      `packages/v2/docs/customTrackModules.md`, `docs/v2/concepts.md`,
      `docs/v2/helpers.md`, and `docs/v2/tracks/README.md`.

  > Docs for sure need fixing, and we need docs for both maintainers/agents as well
  > as users to bundle with the library. The user facing docs need to outline all
  > exported features, but also not be so bloated to keep it easy to read, and for
  > agents to use without rotting context.

- [ ] **[Known bug] Isolate renderer and tooltip failures at their actual React
      boundaries.** The `try/catch` in `TrackContent` catches registry lookup and
      element creation errors, not errors thrown while React renders. Add one boundary
      around each track renderer and a separate boundary around tooltip content in the
      global overlay, with useful reset/retry behavior. Verify that a broken custom
      renderer or tooltip cannot unmount the browser or sibling tracks. Evidence:
      `packages/v2/src/browser/track-row/TrackContent.tsx`,
      `packages/v2/src/browser/tooltip/TooltipOverlay.tsx`, and
      `packages/v2/test/browser/browserWiring.test.tsx`.

- [ ] **[Test/release work] Add the smallest real client-runtime test layers.** Use
      a DOM environment for effects, focus, dialogs, error boundaries, request
      settlement, Strict Mode, and two simultaneous `GenomeBrowser` instances. Use
      browser automation—or a bounded, documented beta acceptance pass until that is
      available—for pointer capture and real SVG coordinate transforms; jsdom is not
      sufficient for those behaviors. Keep pure calculations and stores in fast Node
      tests. Evidence: `packages/v2/vitest.config.ts`,
      `packages/v2/test/browser/browserWiring.test.tsx`,
      `packages/v2/test/app/App.tsx`, and `docs/v2/testing.md`.

## P1: Beta Quality / High Value

- [ ] **[Known bug / refactor] Give settings fields local drafts and consistent
      validation feedback.** Required controlled fields currently reject intermediate
      empty input and snap back, numeric fields mutate/clamp on every keystroke, and
      most module panels discard `TrackMutationResult`. BulkBed's invalid-state message
      is effectively unreachable because invalid edits are rejected, and adding a
      dataset inserts `YOUR_URL_HERE` into live config and can immediately fetch it.
      Let users edit drafts, validate on commit/blur, preserve the last valid runtime
      config, and show errors consistently. Finish settings for retained first-party
      modules, including MethylC and CAVE if CAVE remains. Evidence:
      `packages/v2/src/browser/settings/DefaultBaseSettings.tsx`,
      `packages/v2/src/browser/overlays/SettingsModalController.tsx`,
      `packages/v2/src/tracks/bigwig/settings.tsx`,
      `packages/v2/src/tracks/bulkbed/settings.tsx`, and
      `packages/v2/src/tracks/transcript/settings.tsx`.

  > Number inputs are currently really awkward to use, and the whole UI is a bit
  > too plain.

- [ ] **[Accessibility] Make browser controls and overlays operable without a
      mouse.** The SVG settings/reorder controls and drag-only track handle are not
      focusable buttons and have no accessible names; region selection and panning
      have no keyboard equivalent. Give controls keyboard semantics and visible focus,
      give the context menu menu semantics/focus management, and make the settings
      dialog move focus in, contain it as appropriate, restore it on close, and stay
      within the viewport. Include loading/error announcements without forcing focus.
      Evidence: `packages/v2/src/browser/track-row/TrackControls.tsx`,
      `packages/v2/src/browser/track-row/TrackFrame.tsx`,
      `packages/v2/src/browser/viewport/SelectRegion.tsx`,
      `packages/v2/src/browser/overlays/ContextMenuController.tsx`,
      `packages/v2/src/browser/settings/DefaultSettingsModal.tsx`, and
      `packages/v2/src/browser/overlays/InteractionShield.tsx`.

- [ ] **[Known bug] Fix Dense BigBed interval merging.** Nested overlaps can shrink
      a merged interval because the helper assigns the latest end instead of retaining
      the maximum end. Add pure regressions for nested, touching, and disjoint
      intervals before changing the implementation. Evidence:
      `packages/v2/src/tracks/bigbed/helpers.ts` and
      `packages/v2/test/tracks/bigbedSchema.test.ts`.

- [ ] **[Known bug] Fix retained first-party renderer inconsistencies.** CAVE's top
      and bottom signals each use the full track height despite a half-height divider.
      BulkBed can display a stale fetched `datasetName` after a config-only rename.
      Fix and test each behavior independently; remove the CAVE task if CAVE is removed
      from the beta surface. Evidence: `packages/v2/src/tracks/cave/render.tsx`,
      `packages/v2/src/tracks/bulkbed/fetch.ts`, and
      `packages/v2/src/tracks/bulkbed/render.tsx`.

- [ ] **[Interaction decision / test gap] Make built-in interaction support
      truthful.** BigWig, MethylC, and CAVE accept `onClick` through the shared
      interaction contract but their hover overlays never invoke it. Either implement
      semantic clicks or narrow and document support per module. Then cover empty data,
      clipping, negative/mixed signal ranges, auto-height, and hover/leave transitions
      for each retained built-in. Evidence:
      `packages/v2/src/tracks/bigwig/render.tsx`,
      `packages/v2/src/tracks/methylc/render.tsx`,
      `packages/v2/src/tracks/cave/render.tsx`, and
      `packages/v2/test/tracks/bigwigInteraction.test.ts`.

- [ ] **[Refactor / track-author API] Deepen the proven adapter and geometry
      modules instead of exporting type-bound renderers.** Use the concrete built-in
      and downstream cases in `docs/ideas/trackPrimitives.md`: expose consistent
      package-root BigBed and BigWig regional adapters; extract interval/signal
      projection, packing, and condensation only where at least two real compositions
      use them; retain source items for interactions; and make built-ins consume the
      same public modules. Do not add a universal renderer factory or a hypothetical
      adapter seam. Evidence: `packages/v2/src/tracks/bigbed/fetch.ts`,
      `packages/v2/src/tracks/bigbed/helpers.ts`,
      `packages/v2/src/tracks/bigwig/fetch.ts`,
      `packages/v2/src/tracks/bigwig/helpers.ts`, `packages/v2/src/lib.ts`, and
      `docs/ideas/trackPrimitives.md`.

  > Bigbed module is a bit awkward. Ideally I want all the internally built
  > modules to really be a stepping stone for users. They all do the basics, but
  > can be picked apart, and expose some nice helpful things like SVG rendering
  > functions for signal and annotations, fetch functions etc. Think lego pieces
  > we expose, but also build our own creation internally for simple use cases.

- [ ] **[Legacy parity decision] Publish a bounded v1-to-v2 disposition, not a
      blanket parity promise.** Record each important legacy capability as port,
      replacement, optional-package/application recipe, or non-goal. The starting
      decisions should be: legacy `Custom` and external-data injection are replaced by
      custom modules whose `fetch` can read app-owned data; Manhattan and LD remain
      application/optional-package recipes pending proven point/link primitives;
      Motif and Importance need an explicit demand/ownership decision; MethylC
      `combined` is a first-party parity candidate; SVG/BED/bedGraph export remains the
      separate P2 candidate below; and Apollo `GQLWrapper`, theme state, and Cytobands
      should not enter the core runtime without a current consumer. Evidence:
      `packages/core/src/lib.ts`,
      `packages/core/src/components/tracks/manhattan/types.ts`,
      `packages/core/src/components/tracks/ldtrack/types.ts`,
      `packages/core/src/components/tracks/motif/types.ts`,
      `packages/core/src/components/tracks/importance/types.ts`,
      `packages/core/src/hooks/useCustomData.ts`, `packages/v2/src/modules/types.ts`,
      `packages/v2/docs/customTrackModules.md`, and
      `docs/ideas/trackPrimitives.md`.

  > I don't think we want external data access anymore, now that we can have
  > custom tracks all together. The external data store's overwrite behavior is
  > irrelevant when a custom module can own its fetch.

## P2: Post-Beta / Follow-Up

- [ ] **[Legacy parity candidate] Design export/download only from current v2
      seams.** If current consumers still need publication output, define a narrow
      browser/track export module for full-browser or per-track SVG and raw regional
      BigBed/BigWig data. Do not port v1's global `browserSVG`/wrapper-ID lookup or its
      `any`-based formatters; support multiple browser instances and module-owned data
      serializers explicitly. Evidence: `packages/core/src/utils/download.ts`,
      `packages/core/src/components/contextMenu/contextMenu.tsx`,
      `packages/v2/src/browser/svg/SvgShell.tsx`, and
      `packages/v2/src/browser/data/dataStore.ts`.

- [ ] **[Performance/refactor] Add cancellation or regional cache composition only
      from measured need.** Current stale results are ignored but underlying requests
      are not aborted, and the data store retains only one completed result per track.
      After correctness is locked down, measure rapid external region changes and
      repeated overlapping pans; then either pass an `AbortSignal` through the fetch
      contract or add genomic-interval cache composition. Preserve ADR 0004's raw
      regional data rule and avoid coupling cache validity to width/display. Evidence:
      `packages/v2/src/browser/data/useTrackData.ts`,
      `packages/v2/src/browser/data/dataStore.ts`,
      `packages/v2/src/modules/types.ts`, and
      `docs/v2/adr/0004-fetch-functions-return-raw-region-data.md`.

- [ ] **[Legacy parity candidate] Decide whether runtime typography/margin updates
      are still needed.** v1 exposes setters for margin, font, and title size; v2 only
      accepts them at store construction while exposing `setTrackWidth`. Add validated
      setters only for real responsive/theming consumers, otherwise document them as
      construction-time values. Evidence: `packages/core/src/store/browserStore.ts`,
      `packages/v2/src/browser/state/browserStore.ts`, and
      `packages/v2/docs/concepts.md`.

- [ ] **[Tooling follow-up] Tighten rules after the release gate is stable.** v2
      already has Oxc, Vite, TS Go, Vitest, and format scripts; first make the P0 gate
      green, then decide whether stricter Oxc rules or an opinionated preset adds
      signal. Avoid a tool migration that only churns files before beta. Evidence:
      `packages/v2/package.json`, `packages/v2/tsconfig.app.json`,
      `packages/v2/vite.config.ts`, and root `package.json`.

  > Set up dev tools properly (OXC, Vite, etc.) and enforce strict rules; consider
  > a broader preset only if it improves enforcement rather than adding churn.
