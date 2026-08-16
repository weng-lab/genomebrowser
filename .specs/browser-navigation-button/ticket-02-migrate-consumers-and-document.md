# Ticket 02: Migrate navigation compositions and remove legacy API

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R13–R15, A001
**Blocked by:** Ticket 01

## Outcome

Every repository-owned consumer uses an explicit composition of the new public button API, the legacy fixed toolbar is absent from the package, and shipped documentation explains the supported composition model end to end.

## Scope

Migrate the standalone app and UI manual harness using each browser's existing store instance. Remove the old component, props, tests, exports, and documentation in the same slice. Add self-contained UI package documentation for the replacement API and validate the resulting package and consumer integration.

## Acceptance Criteria

- [ ] The standalone app composes its desired pan and zoom buttons from `BrowserNavigationButton` and passes the same browser store instance used by `GenomeBrowser`.
- [ ] Search-driven region changes continue to work after reshaping the app toolbar around the store-bound API.
- [ ] The UI manual harness includes representative explicit compositions that can be inspected at wide and narrow widths.
- [ ] Repository-owned compositions supply their own children, icons, labels or tooltips where desired, grouping, ordering, wrapping, and MUI presentation.
- [ ] `BrowserNavigationControls`, `BrowserNavigationControlsProps`, their implementation-specific tests, and their package-root exports are removed with no alias, compatibility export, or replacement fixed toolbar.
- [ ] User-facing UI package documentation replaces the legacy controlled-toolbar example with a self-contained store-bound button example.
- [ ] Documentation explains signed pan fractions, zoom factor conventions, use of the same store as `GenomeBrowser`, UI-owned composition, coarse disabled boundaries, consumer `disabled`, and generated versus explicit accessible names.
- [ ] Core source and public core documentation remain unchanged.
- [ ] UI and app typechecking/build verification succeeds with no remaining imports or references to the removed API.

## Verification

Verify the package through its public exports and the two repository consumers rather than adding tests for composition markup. Run the relevant UI tests and UI/app typechecking or builds, search for remaining `BrowserNavigationControls` references, and manually inspect the harness compositions at representative wide and narrow widths when the user-run development server is available.

## Starting Points

- `packages/app/components/Browser.tsx` owns the app's `useBrowserStore` instance.
- `packages/app/components/Toolbars.tsx` contains the existing fixed-toolbar composition and genome search.
- `packages/ui/test/main.tsx` owns and consumes the manual harness browser store.
- `packages/ui/src/lib.ts` exposes the legacy API.
- `packages/ui/docs/browserNavigationControls.md` documents the legacy controlled component.
- `packages/ui/test/browserNavigationControls.test.tsx` tests the component being removed; retain behavior coverage through Ticket 01's public primitive tests rather than porting fixed-toolbar assertions.

## Constraints

- Removal is intentionally breaking and atomic; do not retain compatibility files, aliases, temporary exports, or deprecated wrappers.
- Applications, not the UI package, own toolbar policy and presentation.
- Preserve existing repository navigation choices where practical without turning them into exported presets.
- Never run `pnpm run dev`; the user owns the development server.

## Out of Scope

- A reusable standard toolbar, preset action collection, or compound-component API.
- Redesigning the standalone application's final zoom controls.
- Core navigation changes or core documentation updates.
