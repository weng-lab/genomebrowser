# Package releases

Packages have independent version histories and may be released individually, as a selected group, or together in a coordinated release. Their version numbers do not need to match. Use the version the maintainer specifies for each selected package; otherwise recommend a version from the changes since that package's last published release, following semantic versioning. Leave unchanged packages alone unless a shipped dependency or template change requires a release, or the maintainer explicitly includes them in a coordinated release.

## Establish what is being released

If the request does not name packages or explicitly select a coordinated release, ask which packages to release before changing release files or creating drafts. For example: "Which packages should we release, or should this be a coordinated release of all five?" A request such as "make a 2.0.0 release" specifies a version, not package scope. Do not infer scope from matching manifest versions or publishing scripts. Reuse a scope already established in the conversation.

Compare the intended release commit with each package's actual published baseline, using npm metadata and verified tags. A manifest version or preparation PR is not proof of publication. Include consumer-relevant direct commits and shared changes as well as PRs; include unmerged work only when requested and clearly mark it pending.

Update dependency minimums only where consumers need the new version. Check runtime dependencies, peers, and the starter template, which ships inside the create package. Refresh the lockfile and affected docs with the release changes.

Select the npm dist-tag and GitHub prerelease status to match the intended release. The package manifests and publishing scripts default to `latest` for stable releases. Prereleases require an explicit prerelease version and dist-tag.

## Check the published artifact

Follow [verification guidance](../02-contributing/verify.md), then inspect the pnpm-packed artifacts for exports, declarations, bundled docs, template files, and rewritten workspace/catalog dependencies. Use an isolated consumer when exports or the starter change so workspace links cannot hide packaging errors. Check [generated schemas](collection-schemas.md) when their inputs change.

Dry-run the intended package selection. Before publication, the validated contents must match a clean, committed checkout on the intended remote release branch. Keep lifecycle hooks and Git checks enabled for actual publishing.

## Publish npm, then GitHub

The human handles npm login and publication. An agent prepares and verifies the release, then supplies the exact package versions, release commit, draft links, and publishing command. Even a request to complete a release stops at this npm handoff.

Use an explicit package selection and dist-tag. For example, substitute the selected tag in this reader-only command:

```sh
pnpm --filter @weng-lab/genomic-reader publish --tag <TAG>
```

For the coordinated v2.0.0 release of core, tracks, UI, reader, and create, run `pnpm publish:dry-run`, then have a human run `pnpm publish:stable` from the clean, committed release checkout. These commands select the five public workspace packages; private apps and the starter template are excluded.

The dry run skips Git checks so it can validate preparation changes before they are committed. Actual publication keeps Git checks enabled.

Add `--dry-run` to validate the selection without publishing. For multiple packages, use pnpm's recursive filtered publishing or publish dependencies first. Use a whole-workspace command only when its eligible packages match the intended release set.

After npm publication, verify the exact versions, dependency ranges, and dist-tags. If publication partially fails, identify what is missing and give the human a scoped retry command. Do not republish successful versions or invent new versions to bypass a failure.

GitHub drafts may be prepared beforehand. Publishing them requires a separate explicit request after npm publication; reporting that npm succeeded is not that request. Keep drafts unpublished if the corresponding npm version is missing. Agents do not perform npm registry mutations.

## GitHub releases and notes

Use one release per package, targeting the verified release commit. The naming convention is:

| Package directory | Git tag             | Release title      |
| ----------------- | ------------------- | ------------------ |
| core              | `core-v<VERSION>`   | `Core <VERSION>`   |
| tracks            | `tracks-v<VERSION>` | `Tracks <VERSION>` |
| ui                | `ui-v<VERSION>`     | `UI <VERSION>`     |
| reader            | `reader-v<VERSION>` | `Reader <VERSION>` |
| create            | `create-v<VERSION>` | `Create <VERSION>` |

Private apps are not package release targets. Reuse existing drafts; investigate conflicting tags rather than moving them. Update published releases only when requested.

Write each release as a package-specific changelog from its previous published version, followed by upgrade notes only where consumers need to take action. Name the comparison version explicitly, including its prerelease suffix when applicable. A coordinated release still uses each package's own published baseline.

Open with a short summary of what changed and a link to the exact npm version. Put the change list first, grouping additions, fixes, and removals when that helps readers. Include relevant PR links. Follow it with an optional "Upgrade notes from <previous version>" section describing required API, configuration, data, or dependency changes. Mention breaking changes in the changelog and explain how to migrate in the upgrade section. Do not lead with migration instructions, repeat unchanged installation requirements, or turn the notes into a package overview. Link setup and API documentation for background.

Small releases can be a single changelog paragraph and need no upgrade section when no action is required. If an older stable version also needs a separate migration path, label it explicitly after the changes rather than mixing it with the previous-release upgrade notes. Omit routine checks and internal cleanup unless they affect consumers.
