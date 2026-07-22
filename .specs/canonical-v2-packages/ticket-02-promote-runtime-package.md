# Ticket 02: Promote the runtime package

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R2, R3, R4, R5, R6, R7, R8, R12
**Blocked by:** Ticket 01

## Outcome

The active browser runtime lives at `packages/core` and is consumed throughout the workspace as `@weng-lab/genomebrowser@2.0.0-alpha.0`; the UI remains at its temporary folder and package identity but depends only on the promoted runtime identity.

## Scope

Move `packages/v2` to `packages/core`, adopt the canonical runtime package name and prerelease version, update its generated artifact identity, and migrate every active consumer from `@weng-lab/genomebrowser-v2`. Rename and revise runtime maintainer and shipped documentation, root commands, contributor guidance, and configuration in the same change.

## Acceptance Criteria

- [x] The runtime resides at `packages/core`; `packages/v2` no longer exists.
- [x] Its manifest name is `@weng-lab/genomebrowser` and its version is `2.0.0-alpha.0`.
- [x] Runtime exports, declaration paths, and generated bundle names consistently use the canonical identity and remain valid after a clean build.
- [x] The UI package's workspace dependency and all source, test, configuration, and example imports resolve through `@weng-lab/genomebrowser`.
- [x] Active runtime maintainer docs move from `docs/v2` to `docs/core`, and runtime package docs use canonical installation and import instructions.
- [x] Root runtime scripts, `AGENTS.md`, and applicable checked-in tooling references use the `core` folder and canonical package name without temporary v2 aliases.
- [x] The root lockfile is regenerated with `packages/core` as the runtime importer and no `packages/v2` importer.
- [x] Prioritized `TODO.md` files are not edited; stale references are reported in the handoff.

## Verification

Run runtime and UI package checks because the UI is the primary internal consumer. Verify a clean recursive build, search tracked non-TODO source/config/docs for the obsolete runtime package name and folder path, and inspect the built runtime entry point and declaration path.

## Starting Points

- `packages/v2/package.json`, `packages/v2/vite.config.ts`, `packages/v2/src/lib.ts`
- `packages/ui-v2/package.json`, imports under `packages/ui-v2/src` and `packages/ui-v2/test`
- `docs/v2`, `packages/v2/README.md`, `packages/v2/docs`
- Root scripts, `AGENTS.md`, `.agents/skills/react-doctor/SKILL.md`

## Constraints

- Preserve the runtime architecture established by `docs/v2/adr` when those records move to `docs/core/adr`.
- Keep the UI at `packages/ui-v2` and under its temporary npm identity in this ticket.
- Do not introduce compatibility exports for `@weng-lab/genomebrowser-v2`.
- Do not change browser behavior or edit `TODO.md` files.

## Out of Scope

- UI folder and npm identity promotion.
- Final publication metadata audit and packed-consumer testing.
