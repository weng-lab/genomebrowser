# Turborepo in this repository

Turborepo runs package scripts in the right order and caches their results. It
does not replace pnpm, Vite, Vitest, TypeScript, or Next.js. Those tools still do
the work; Turbo decides which package scripts need to run.

Run Turbo commands from the repository root.

## Daily commands

The root scripts are the normal entry points:

```sh
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm verify
```

`pnpm verify` runs formatting checks, lint, builds, and tests. Turbo runs tasks
concurrently where the package graph allows it. A successful cached task prints
`cache hit` and restores any declared files without running the package script.

Use `pnpm format` and `pnpm lint:fix` when you want to change files. Turbo never
caches these tasks because they have side effects.

## Run one package

Use a Turbo filter instead of invoking a package script directly. This keeps
dependency ordering and caching in effect.

```sh
pnpm exec turbo run test --filter=@weng-lab/genomebrowser-tracks
pnpm exec turbo run build --filter=@weng-lab/genomebrowser-app
pnpm exec turbo run typecheck --filter=@weng-lab/genomebrowser-ui
```

Useful filter forms are:

- `--filter=@weng-lab/genomebrowser-ui` selects one package.
- `--filter=@weng-lab/genomebrowser-ui...` selects the package and its
  dependencies.
- `--filter=...@weng-lab/genomic-reader` selects the package and its dependents.
- `--affected` selects packages changed relative to `main`, plus their
  dependents.

Task dependencies in `turbo.json` still apply to a filtered run. For example,
the tracks typecheck builds core and reader first because tracks consumes their
generated declarations.

## How this task graph works

The package manifests define the commands. The root `turbo.json` defines their
ordering, inputs, and cached outputs.

- `build` runs the package's dependency builds and its own typecheck first. The
  package build scripts only produce and validate artifacts. Turbo caches
  `dist`, `.next`, and TypeScript build information.
- `test` and `typecheck` build workspace dependencies first. Several packages
  resolve workspace imports through generated `dist` declarations, so these
  edges make clean checkouts reliable.
- `lint` uses a transit task. This lets package lint tasks run concurrently while
  still invalidating their cache when dependency source changes.
- `format:check` runs once per package. A root task checks repository files such
  as `package.json`, `README.md`, and `.github`.
- `format` and `lint:fix` are not cached because they edit files.

Environment files are build and test inputs. The MUI license variables are also
part of the test hash. Changes to the root Oxlint or Oxfmt configuration
invalidate the corresponding package checks.

The local cache lives at `.turbo/cache` in each worktree. The directory is
ignored by Git and can be removed without losing source or build configuration.

The Next.js app overrides the root build dependency because `next build` already
runs TypeScript. Publishable libraries provide `build:checked` for lifecycle
hooks that run without Turbo. It typechecks the package and then builds its
artifacts.

## Inspect and bypass the cache

To see the planned tasks without running them:

```sh
pnpm exec turbo run build --dry
```

To rerun a task even when its hash is cached:

```sh
pnpm exec turbo run test --filter=@weng-lab/genomebrowser-ui --force
```

Use `--force` for diagnosis, not as a normal workflow. A surprising cache miss
usually means an input, dependency, command, environment value, or lockfile
changed. A surprising cache hit usually means `turbo.json` is missing an input
or environment variable.

## Add or change a task

Put the command in each package that owns it, then register the task in
`turbo.json`. Keep the root package script as a `turbo run` entry point.

When configuring the task:

1. Add `dependsOn` edges for files it consumes from workspace packages.
2. List files written by the task in `outputs`. Use an empty output list when it
   writes nothing.
3. Add environment variables that affect the result to `env`.
4. Add ignored environment files or shared root configuration to `inputs` when
   they affect the result.
5. Set `cache: false` for development servers, file-changing commands, and other
   tasks with side effects.

Do not use `--parallel`; it bypasses the dependency graph. Normal build and
check scripts should not manually build another package. Declare the workspace
dependency and let a `^build` edge order the work. The existing `prepack`
scripts are an intentional exception. They run `build:checked` for publication
dependencies so packing a package cannot use stale generated declarations or
executables.

## Current limits

CI uses the same root commands and receives local cache benefits only within one
job. Remote caching and affected-only CI are not configured. Turbo also does not
yet coordinate the package development servers, so use the existing package
development commands when a human needs one.
