# Promote v2 packages and clean the monorepo

**Status:** Ready

## Problem

The monorepo currently carries legacy and replacement implementations side by side. The active browser runtime and UI use temporary v2 folder and package names, while the legacy packages still own the canonical npm names. This duplicates tooling and documentation, makes repository search and navigation ambiguous, and prevents the replacement packages from being tested as prereleases under their intended public identities.

## Desired Outcome

The replacement runtime and UI are the only maintained implementations in the workspace. They live in `packages/core` and `packages/ui`, use the canonical npm names, and are configured as coordinated `2.0.0-alpha.0` prereleases. Legacy code, documentation, configuration, and stale references are removed, and the resulting package artifacts can be validated in clean consumer projects before any public release.

## Current State

- `packages/v2` contains the active browser runtime as `@weng-lab/genomebrowser-v2`.
- `packages/ui-v2` contains the active application UI as `@weng-lab/genomebrowser-ui-v2` and depends on the v2 runtime.
- `packages/core` and `packages/ui` contain legacy implementations under the canonical npm names.
- Root scripts, the workspace lockfile, maintainer docs, package docs, TODO references, and local repository guidance distinguish between legacy and v2 packages.
- Legacy packages carry obsolete package-local tooling, and `packages/core` has its own lockfile despite being part of the pnpm workspace.
- Existing ADRs define the active runtime and UI architecture and remain authoritative through the repository transition.

## Requirements

- **R1:** Remove the legacy implementations currently under `packages/core` and `packages/ui`, including their source, tests, examples, package-local lockfile, and obsolete tooling configuration.
- **R2:** Move the active runtime from `packages/v2` to `packages/core` and the active UI from `packages/ui-v2` to `packages/ui`, preserving their runtime behavior and package boundaries.
- **R3:** Rename the promoted packages to `@weng-lab/genomebrowser` and `@weng-lab/genomebrowser-ui` respectively, and set both package versions to `2.0.0-alpha.0`.
- **R4:** Update all imports, workspace dependencies, build configuration, generated artifact names, executable configuration, examples, and repository references to use the canonical package names and promoted folder paths.
- **R5:** Remove legacy-only and temporary-v2 root scripts, dependencies, lockfile importers, aliases, and configuration. Root commands must address the two promoted packages without parallel legacy/v2 vocabulary.
- **R6:** Keep one pnpm lockfile at the repository root and regenerate it from the final workspace package graph.
- **R7:** Delete legacy-only documentation and stale placeholders. Rename and revise active maintainer and package documentation so it describes only the canonical runtime and UI packages and contains no obsolete v2 installation or import instructions.
- **R8:** Update repository guidance and local tooling references, including `AGENTS.md` and applicable checked-in skills, to reflect the final package map and supported commands.
- **R9:** Preserve historical legacy code through Git history and an identifiable pre-transition Git tag; do not retain a legacy source tree in the active repository layout.
- **R10:** Give both promoted package manifests complete publication metadata and explicit public publication configuration, with valid exports, type declarations, included files, licenses, and the UI package's runtime dependency resolving to the promoted core package.
- **R11:** Validate the exact packed artifacts in clean external consumer fixtures, including imports from both package roots, the UI CLI subpath and executable, type resolution, production builds, and coexistence of both installed packages.
- **R12:** Keep documentation updates in the same changes as the package, command, or contributor-guidance changes they describe.
- **R13:** Record the package-line replacement and removal of the in-tree legacy implementation in a concise ADR.

## Technical Decisions

- Folder names are repository-local architecture names: `packages/core` owns the browser runtime and `packages/ui` owns the optional higher-level UI. They do not need to mirror npm package names.
- The canonical npm identities are `@weng-lab/genomebrowser` and `@weng-lab/genomebrowser-ui`; the `-v2` package identities are transitional and must not remain in consumer-facing APIs or documentation.
- Both packages use coordinated prerelease version `2.0.0-alpha.0`. A future publication must use an `alpha` or `next` dist-tag rather than replacing `latest` while the packages remain prereleases.
- The transition may be delivered in multiple tasks, but the repository must not finish the effort with duplicate active package identities or mixed legacy/v2 guidance.
- Repository cleanup must not intentionally change browser or UI behavior. Behavioral refactors belong in separate work unless required to make the promoted package artifacts valid.
- Legacy recovery is a version-control concern, not a workspace concern. The legacy tree will be deleted after its final state is made identifiable with a Git tag.
- Existing runtime and UI ADRs remain authoritative. Any implementation discovery that conflicts with them requires a design decision rather than silently changing architecture during cleanup.

## Verification Strategy

- Confirm the workspace contains exactly the promoted `core` and `ui` packages and that package discovery reports each canonical npm name once.
- Search tracked source, configuration, docs, and examples for obsolete package names, `packages/v2`, `packages/ui-v2`, and legacy-only commands; any intentional historical mention must be explicit and justified.
- Run repository-prescribed formatting, linting, type/build, and test checks for both promoted packages and the root recursive commands.
- Inspect packed tarball contents and package manifests rather than relying only on workspace builds.
- Install packed tarballs into clean consumer fixtures without workspace linking, then verify imports, declaration resolution, UI CLI behavior, and a production consumer build.
- Verify prerelease metadata and dry-run publication output without changing npm dist-tags or publishing packages as part of this effort.
- Review active maintainer docs, shipped package docs, root README, repository guidance, and the new ADR against the final package names and commands.

## Out of Scope

- Publishing either package to npm or changing the `latest` dist-tag.
- Providing a compatibility layer that preserves the temporary `-v2` npm package names.
- Maintaining a copy of the legacy implementation inside a `legacy` directory.
- Migrating existing v1 consumer applications or promising API compatibility with the legacy packages.
- Runtime feature work, UI redesign, or architectural refactoring unrelated to package promotion and publication readiness.
- Editing prioritized `TODO.md` files unless the user separately authorizes those edits; stale TODO references should be reported for an explicitly authorized follow-up.

## Risks and Edge Cases

- Existing stable consumers use the same canonical npm names, so accidental publication under `latest` could expose an unfinished breaking release.
- Workspace linking can hide invalid dependency ranges, missing files, bad exports, and declaration-path errors; packed-artifact testing is required.
- Moving folders without removing stale aliases or lockfile importers can make local builds pass against unintended source paths.
- Generated filenames and documentation may embed temporary package names even after manifest names change.
- Deleting legacy package licenses without ensuring each promoted artifact includes appropriate license metadata or files could make the packages unsuitable for publication.
- Coordinating the UI package at major version 2 is intentional despite its legacy line being below 1.0; documentation must present this as the new coordinated package generation rather than inferred API continuity.
