# Ticket 01: Retire legacy packages

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R1, R5, R6, R7, R8, R9, R12
**Blocked by:** None

## Outcome

The legacy runtime and UI are recoverable through an identifiable Git baseline but no longer exist as active workspace packages, documentation, tooling, or root commands. The temporary v2 packages remain functional and become the only implementations in the workspace.

## Scope

Establish the pre-transition Git reference, remove the current `packages/core` and `packages/ui` trees, delete legacy-only documentation and placeholders, and remove root configuration that exists only for those packages. Regenerate workspace dependency state and make the smallest guidance updates necessary to describe the temporary two-package workspace accurately.

## Acceptance Criteria

- [x] An identifiable Git tag records the final pre-transition legacy state, and its name is documented in the implementation handoff.
- [x] The legacy contents of `packages/core` and `packages/ui` are deleted, including source, tests, examples, obsolete package configuration, and `packages/core/pnpm-lock.yaml`.
- [x] Legacy-only maintainer documentation and placeholders, including `docs/ui/tbd.md`, are deleted.
- [x] Root scripts and dependencies that serve only the deleted packages are removed; commands for the active v2 packages still work.
- [x] The root lockfile is regenerated without legacy workspace importers, and no package-local lockfile remains.
- [x] `AGENTS.md` and other directly affected contributor guidance describe the temporary workspace accurately without presenting deleted code as active.
- [x] Prioritized `TODO.md` files are not edited; any references made stale by this ticket are reported in the handoff.

## Verification

Confirm pnpm discovers only the two v2 packages. Run the repository-prescribed build, test, lint, and formatting checks for both remaining packages, and search tracked non-TODO files for references that assume the deleted legacy trees still exist.

## Starting Points

- `packages/core`, `packages/ui`
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- `docs/ui/tbd.md`, `AGENTS.md`
- Root `@mui/x-tree-view` ownership should be checked rather than assumed to be legacy-only.

## Constraints

- Do not retain a `legacy` directory or copy of the deleted implementations.
- Do not rename or modify the active v2 package identities in this ticket.
- Do not change runtime or UI behavior.
- Do not edit any `TODO.md` without separate user authorization.

## Out of Scope

- Promoting either v2 package to a canonical folder or npm name.
- Publication metadata and packed-consumer validation.
