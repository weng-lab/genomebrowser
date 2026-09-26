# Shared dependencies

Define versions for external dependencies shared across workspace packages in
the `pnpm-workspace.yaml` catalog. Reference them with `catalog:` in each
consumer's dependencies or development dependencies. Dependencies used by only
one app or package keep their versions in that consumer's `package.json`.
Internal packages use `workspace:` references.
Libraries must also declare their runtime peers as development dependencies
so local builds use the same versions as the apps. Keep published peer
dependency ranges compatible rather than pinning them to the catalog.

Shared library build and test tools also use the workspace catalog so their
versions can be updated in one place. Each package must still declare the tools
it directly uses; the catalog centralizes versions, not package ownership.

Use TypeScript 7 wherever the tooling allows. Apps and packages whose tools
only run `tsc` declare `"typescript": "catalog:native"`. TypeScript 7 does not
provide a JavaScript compiler API, so packages with tools that import one, such
as `vite-plugin-dts`, keep the default `typescript` catalog entry for the
TypeScript 6 API. Those packages also declare `@typescript/native`, because the
TypeScript 6 package installs its compiler as `tsc6` and their `tsc` scripts
would otherwise fall back to a global installation.

Keep the MUI and MUI X catalog versions within the peer ranges supported by
`@weng-lab/ui-components`. Upgrade those major versions together when the
component package supports them so the workspace does not install two MUI
generations.

The standalone starter in `packages/create/template` maintains its own
dependency versions and does not use the workspace catalog.
