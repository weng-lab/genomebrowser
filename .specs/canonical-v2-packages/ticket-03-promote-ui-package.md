# Ticket 03: Promote the UI package

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R2, R3, R4, R5, R6, R7, R8, R12, R13
**Blocked by:** Ticket 02

## Outcome

The active UI lives at `packages/ui` as `@weng-lab/genomebrowser-ui@2.0.0-alpha.0`, leaving a two-package workspace with no temporary v2 identities or paths. Documentation and contributor guidance describe this final package map, and the replacement decision is recorded.

## Scope

Move `packages/ui-v2` to `packages/ui`, adopt the canonical UI npm identity and coordinated prerelease version, and update its bundle, CLI, imports, examples, docs, root commands, and local tooling references. Move UI maintainer docs to their canonical location and add the concise ADR required by the spec.

## Acceptance Criteria

- [ ] The UI resides at `packages/ui`; `packages/ui-v2` no longer exists.
- [ ] Its manifest name is `@weng-lab/genomebrowser-ui` and its version is `2.0.0-alpha.0`.
- [ ] The package root export, `./cli` export, `trackselect` executable, declaration paths, and generated bundle names remain valid under the canonical identity.
- [ ] Active UI maintainer docs move from `docs/ui-v2` to `docs/ui`, and shipped UI docs use only canonical installation and import instructions.
- [ ] Root scripts, `AGENTS.md`, applicable checked-in skills, examples, and configuration describe only `packages/core` and `packages/ui` under their canonical npm names.
- [ ] A concise ADR records that the v2 implementations replace the legacy package lines, use canonical npm names, and do not retain an in-tree legacy copy.
- [ ] The root lockfile is regenerated with exactly the `packages/core` and `packages/ui` workspace importers.
- [ ] A tracked search outside explicitly exempt historical or prioritized TODO material finds no obsolete `@weng-lab/genomebrowser-v2`, `@weng-lab/genomebrowser-ui-v2`, `packages/v2`, or `packages/ui-v2` references.
- [ ] Prioritized `TODO.md` files are not edited; stale references are reported in the handoff.

## Verification

Run all package tests, builds, lint, formatting, and root recursive checks. Verify UI root and CLI declaration/build outputs, workspace package discovery, and the absence of obsolete v2 identities in tracked non-TODO files.

## Starting Points

- `packages/ui-v2/package.json`, `packages/ui-v2/vite.config.ts`, `packages/ui-v2/src/lib.ts`, `packages/ui-v2/src/cli.ts`
- `packages/ui-v2/README.md`, `packages/ui-v2/docs`, `docs/ui-v2`
- `package.json`, `AGENTS.md`, `.agents/skills/react-doctor/SKILL.md`
- ADR format is governed by the repository's ADR workflow; preserve existing package ADRs when moving docs.

## Constraints

- Keep UI dependent on the public `@weng-lab/genomebrowser` boundary.
- Do not add temporary package-name aliases or preserve a v2 folder.
- Do not publish or alter npm dist-tags.
- Do not change UI behavior or edit `TODO.md` files.

## Out of Scope

- Broader manifest metadata hardening and clean-consumer artifact validation.
