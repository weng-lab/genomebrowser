# Package releases

Core, tracks, UI, reader, and create release independently ([ADR 0005](../adr/0005-independent-package-releases.md)); their versions need not match.

## Scope and versions

- Release only the packages the maintainer names, or all of them when they ask for a coordinated release. A version number alone is not a scope; ask.
- Use the maintainer's versions, or recommend semantic versions from the changes since each package's last **published** release. Check npm and tags; a manifest version is not proof of publication.
- Raise dependency minimums only where consumers need them, including the starter template inside create.
- Prereleases need an explicit prerelease version and dist-tag; stable releases use `latest`.

## Publish

1. Run [verify](../contributing/verify.md), inspect the `pnpm pack` output (exports, declarations, bundled docs, rewritten `workspace:`/`catalog:` ranges), and dry-run the selection, such as `pnpm --filter @weng-lab/genomic-reader publish --tag <TAG> --dry-run`. Use a separate consumer project when exports or the starter change.
2. A human publishes to npm from a clean, committed release checkout, with Git checks on. Agents stop here and hand over the exact command, versions, and commit. `pnpm publish:dry-run` and `pnpm publish:stable` select all five packages.
3. After npm succeeds, verify the published versions, ranges, and dist-tags. On a partial failure, give a scoped retry command; never republish or bump versions to get around it.
4. Publish GitHub releases only on a separate explicit request, after npm succeeded.

## GitHub releases

One release per package on the release commit, tagged `<package>-v<VERSION>` and titled `<Package> <VERSION>`, such as `core-v2.1.0` / `Core 2.1.0` or `ui-v2.1.0` / `UI 2.1.0`.

Notes open with a one-line summary and a link to the npm version, then the changes since the named previous version, with PR links. Add "Upgrade notes from <version>" only when consumers must act. Leave out internal cleanup and routine checks.
