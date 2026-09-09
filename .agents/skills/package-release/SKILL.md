---
name: package-release
description: Prepare independently versioned genomebrowser releases, hand off npm publishing to the user, and publish GitHub drafts only when the user requests it after npm publication. Use for package release work, not standalone app deployment.
---

# Package release

Release each package on its own version history. Keep notes short, readable, and focused on consumer-visible changes and relevant upgrade information.

## Scope and conventions

Match the user's requested stage: inventory, preparation, dry run, draft releases, or post-npm GitHub publication. The user handles npm login and actual npm publication. Prepare and validate packages and GitHub drafts, then hand off the publishing command. Even a general complete-release request stops at this handoff. After publishing to npm, the user tells Codex when to publish the GitHub releases; confirmation that npm succeeded alone is not that instruction. Once the user explicitly requests GitHub publication after npm publication, proceed without asking again.

Read the root `AGENTS.md`, `CONTRIBUTING.md`, current manifests, and publishing scripts. Discover existing release tooling rather than assuming Changesets or release automation is installed.

| Directory | npm package | Git tag | GitHub title |
| --- | --- | --- | --- |
| `packages/core` | `@weng-lab/genomebrowser` | `core-v<VERSION>` | `Core <VERSION>` |
| `packages/tracks` | `@weng-lab/genomebrowser-tracks` | `tracks-v<VERSION>` | `Tracks <VERSION>` |
| `packages/ui` | `@weng-lab/genomebrowser-ui` | `ui-v<VERSION>` | `UI <VERSION>` |
| `packages/reader` | `@weng-lab/genomic-reader` | `reader-v<VERSION>` | `Reader <VERSION>` |
| `packages/create` | `@weng-lab/create-genomebrowser` | `create-v<VERSION>` | `Create <VERSION>` |

Confirm this map against current manifests. Private apps, benchmarks, and the generator template are not npm release targets. The template ships inside the generator.

Use one GitHub release per released package. Versions need not match. During the current beta series, preserve the `beta` npm dist-tag and mark GitHub releases as prereleases. A stable release is a separate, explicit decision; reconcile `publishConfig.tag`, commands, dependency ranges, and docs before changing channels. Never silently promote a beta to `latest`.

## Establish the release inventory

- Read npm versions and dist-tags, remote tags/releases (including drafts), the target branch, and the working tree. Do not assume a manifest version is published or an unpublished version needs another bump.
- Find each package's last published version and source commit. Prefer its verified tag or publication metadata. A preparation PR may not be the actual publication baseline. If metadata is missing, compare published contents where useful and state remaining uncertainty.
- Review PRs and commit diffs from that baseline to the intended release commit. Include direct commits, shared code, packaging, and dependency changes that affect the package. Inspect public exports and actual behavior before calling something additive or breaking.
- Include open PRs only when requested, clearly marked pending. Recheck their final merged changes before releasing; never describe unmerged work as shipped.
- Produce a compact table of current published version, changes, migration notes, and proposed version. Unchanged packages keep their versions unless a shipped dependency or template change requires a release.

## Prepare versions and packages

1. Choose versions independently. Continue the current prerelease series when appropriate and explicitly document breaking beta behavior. For stable versions, classify the public change before choosing a SemVer bump.
2. Update package versions and dependency minimums wherever consumers need newly introduced APIs. Check runtime dependencies, peers, workspace development dependencies, and the generator's embedded template. Keep compatible ranges that do not need to change; do not mechanically synchronize every dependency.
3. Refresh the lockfile with the repository's pnpm version. Inspect the diff for unrelated resolution changes. Update version-specific documentation that would otherwise become misleading.
4. When the generator template changes, follow its `AGENTS.md`. Check its generated collection schema separately; root verification does not necessarily check schema freshness. Regenerate through the existing schema command if required, never by hand.
5. Prepare package-specific notes using the format below. Follow the repository's commit/PR conventions if those operations are requested, including its rule about committing pre-existing user changes.

## Validate the actual release

- Run `pnpm verify` and any applicable package/template checks. Report failures accurately; prior CI or a successful dry run is not evidence that newly changed files passed.
- Inspect the packed files and manifests: public exports, types, shipped docs/template, rewritten workspace/catalog dependencies, versions, and channel. Use pnpm's packing/publishing flow so workspace dependencies receive its normal transformation.
- The current root `pnpm publish:dry-run` checks all public packages. For a subset, use explicit package filters and inspect the selected names; do not expand publishing scope merely because the root command is recursive.
- When exports or the generator template change, smoke-test the selected packed packages in an isolated consumer. For the generator, create a fresh app and install/build it against the selected tarballs, so workspace links cannot conceal a missing export or dependency. Follow repository rules about development servers.
- Before publishing, confirm the exact committed SHA is on the intended remote release branch, the release checkout is clean and up to date, and its contents match the validated packages. Do not use `--no-git-checks` for actual publication. If the user only requested preparation, report readiness and stop at that stage.

## Hand off npm publication to the user

Do not run actual npm publication, npm login, or registry mutations. The user publishes because npm requires their interactive login. Codex may run dry runs and read public registry metadata.

After validation, provide the exact package/version list, release commit, draft links, and command for the user to run. The current whole-workspace beta command is `pnpm publish:beta`; recommend it only when its eligible unpublished packages match the intended release set. For a subset, give explicit package filters. For example, a reader-only handoff is:

```sh
pnpm --filter @weng-lab/genomic-reader publish --tag beta
```

This command is for the user to execute. Codex can validate that selection with `--dry-run`. For multiple packages, prepare explicit filters with recursive publishing or order dependencies before dependents. Preserve lifecycle and Git checks and confirm the configured publish branch.

If the user reports a partial failure or uncertain result, inspect npm read-only and identify successful and missing versions. Give the user a scoped retry command for only missing versions; do not retry publication yourself, force-republish, unpublish, move dist-tags, or invent a new version to escape a failure.

When the user reports publication, verify every selected exact version, published dependency ranges, and intended dist-tag against npm. Report any discrepancy. Leave GitHub drafts unpublished until the user explicitly asks to publish them after npm publication.

## Create or finish GitHub releases

Prepare drafts before npm publication within the requested scope. Turn drafts into published releases only after the user confirms npm publication and explicitly requests GitHub publication. Verify the exact npm versions first. If a version is missing, leave its draft unpublished and report the discrepancy.

- Use the short package tag and title from the table. Target the full verified release commit SHA, not a moving branch name. Several package tags may point to the same commit.
- Look up the exact tag and any existing draft/release first. Update an existing draft instead of duplicating it. If an existing tag points elsewhere, investigate rather than moving it. Do not rewrite a published release unless requested.
- Before publishing each draft, link its exact npm version in the opening sentence: `https://www.npmjs.com/package/<PACKAGE>/v/<VERSION>` (for example, `https://www.npmjs.com/package/@weng-lab/genomic-reader/v/2.0.0-beta.2`). Verify the package/version against registry metadata; do not link only to the package landing page or claim an unpublished draft version is available.
- Use structured arguments or `gh --notes-file` with an actual UTF-8 file. Avoid shell-interpolated multiline notes and repository-wide autogenerated release notes.
- Set prerelease status from the selected release channel. Verify returned names, tags, target commits, draft/published state, and links. GitHub may give drafts temporary `untagged-...` URLs; use the returned URL and do not mistake the configured draft tag for a verified remote Git tag.
- After publication, confirm the remote tag resolves to the intended commit. Finish with a compact per-package list of npm versions and GitHub links, plus any remaining work. Distinguish drafts from published releases.

## Release note style

Start with one sentence describing the package's main change and identify the exact npm package/version. Use a short **Changes** list; add **Upgrade notes** only when useful. Put a breaking migration before the changes when users must act before upgrading. Small releases can be one paragraph.

- Describe outcomes: “Edit existing highlights in the Highlights dialog,” rather than file names, implementation chronology, or PR summaries pasted wholesale.
- Combine related work into one bullet. Include relevant PR links; do not treat a missing PR as a reason to omit a direct-commit change.
- Mention dependency changes only when they explain compatibility or installation requirements. Omit routine tests, CI, development dependency alignment, and internal refactoring unless consumers are affected.
- Include necessary migration steps, changed defaults, required dependency minimums, and meaningful limitations. Avoid exhaustive settings lists, API dumps, generic warnings, and empty headings.
- Keep each package's notes self-contained. Cross-package context belongs only where it explains that package's behavior or upgrade path.

Example shape, adapted to the actual release:

```md
[@weng-lab/genomic-reader@<VERSION>](https://www.npmjs.com/package/@weng-lab/genomic-reader/v/<VERSION>) adds HTTP range reads for UCSC 2bit reference sequence.

### Changes

- Read reference DNA while preserving unknown and soft-masked bases. [#187](https://github.com/weng-lab/genomebrowser/pull/187)

### Upgrade notes

The source server must support byte ranges and browser CORS. Existing reader APIs are unchanged.
```

The example illustrates tone and structure; derive each release's claims from its own verified diff.
