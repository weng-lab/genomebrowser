# Ticket 04: Normalize monorepo and package metadata

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R5, R6, R7, R8, R10, R12
**Blocked by:** Ticket 03

## Outcome

The canonical two-package monorepo has intentional root-owned tooling, concise contributor orientation, and publication-ready package manifests without legacy dependencies or configuration residue.

## Scope

Audit root and package-level dependencies and tooling ownership, remove stale configuration, improve the root README, and complete publication metadata for both packages. Validate licenses, exports, declaration entry points, included files, repository metadata, and public publication settings without publishing.

## Acceptance Criteria

- [ ] Root dependencies contain only dependencies genuinely required by root-owned tooling; package runtime and peer dependencies are owned by the appropriate package.
- [ ] Root scripts expose a coherent command set for `core`, `ui`, and recursive checks without obsolete, duplicate, or misleading aliases.
- [ ] Shared formatter, linter, TypeScript, Vite, and test configuration is either intentionally root-owned or intentionally package-owned; legacy configuration residue is removed.
- [ ] The root README explains the two-package map, supported development and verification commands, prerelease status, and the separation between runtime and optional UI.
- [ ] Both package manifests include accurate description, license, repository/homepage metadata, files, exports, types, and explicit public `publishConfig` fields.
- [ ] Both packages retain or include the required license material in their packed files.
- [ ] The UI dependency on `@weng-lab/genomebrowser` has a publishable prerelease-compatible relationship rather than relying on an invalid external `workspace:*` declaration.
- [ ] A publication dry run reports both packages as `2.0.0-alpha.0` and does not modify npm state.
- [ ] Documentation and contributor guidance affected by command or metadata changes are updated in the same ticket.
- [ ] The root lockfile is current and remains the only lockfile.

## Verification

Run all repository checks from a clean dependency graph, inspect both package manifests and dry-run pack/publish output, and verify that only intended files appear in each package tarball. Confirm the root has no application dependency accidentally masking a missing package dependency.

## Starting Points

- Root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.oxlintrc.json`, `.oxfmtrc.json`, `README.md`
- `packages/core/package.json`, `packages/ui/package.json`
- Package Vite, TypeScript, and Vitest configurations
- The root `@mui/x-tree-view` dependency is a known ownership question.

## Constraints

- Do not publish, modify dist-tags, or run the development server.
- Do not collapse runtime and UI into one package.
- Avoid unrelated tooling migrations; prefer deleting residue and clarifying ownership over introducing new abstraction.
- Do not edit prioritized `TODO.md` files.

## Out of Scope

- Automated clean-consumer installation and deployment-style builds, which belong to Ticket 05.
