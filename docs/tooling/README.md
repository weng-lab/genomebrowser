# Tooling

## Builds

Package scripts own their commands; `turbo.json` owns ordering and caching. Packages consume each other's built output, so keep dependency ordering in Turbo rather than nesting dependency builds in package scripts. Tasks that edit source, such as formatting and lint fixes, stay uncached. A task's Turbo inputs must include every file and environment variable it reads.

The exception is publishing: library `prepack` hooks run `build:checked` outside Turbo and build their own dependencies, so a pack never contains stale output.

`legacy/` holds archived apps outside the workspace and Turbo.

## Dependencies

- External dependencies shared by several workspace packages take their version from the `pnpm-workspace.yaml` catalog (`catalog:`); a dependency used by one package keeps its version there. Internal packages use `workspace:`.
- Libraries also declare their runtime peers as dev dependencies, so builds use the apps' versions, while keeping published peer ranges broad.
- Use TypeScript 7 (`catalog:native`) where tools only run `tsc`. Packages whose tools import the compiler API, such as `vite-plugin-dts`, keep the TypeScript 6 catalog entry and also declare `@typescript/native`.
- Keep MUI and MUI X within `@weng-lab/ui-components`' peer ranges, and upgrade their majors together.
- `packages/create/template` keeps its own versions, outside the catalog.

## Collection schemas

The first-party track collection schema is generated from module definitions; never edit the JSON by hand. After changing its inputs, from the repository root:

```sh
pnpm exec turbo run build --filter=@weng-lab/genomebrowser-tracks...
node packages/core/dist/cli.js schema --from './packages/tracks/dist/genomebrowser-tracks.es.js#firstPartyTrackModules' --out packages/tracks/schemas/trackCollection.schema.json
```

If the tracks build fails on a stale track count, run `pnpm --dir packages/tracks exec vite build` and regenerate. The starter template has its own `schema` and `schema:check` scripts in `packages/create/template`; `pnpm verify` does not run them.

## Releases

See [releases](releases.md).
