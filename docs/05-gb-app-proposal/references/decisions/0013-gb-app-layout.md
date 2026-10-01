# 0013. The gb app lives in apps/: server, workspace, local and cloud

Decided 2026-10-01.

## Why this came up

The genomebrowser monorepo keeps the library in `packages/`. The gb app adds a shared server, a shared UI, the local CLI and the cloud site. An earlier plan put the server in one package with `local/` and `cloud/` folders, which would make the CLI install Postgres and the accounts library. A finer split (separate packages for commands, the API server and the local page) felt too fragmented for a team of three.

## What we chose

`packages/` is the library and `apps/` is the gb app. The app has four folders:

- `apps/server`: the shared server core and the command definitions (`server/commands`).
- `apps/workspace`: the shared React UI.
- `apps/local`: the `gb` CLI and its Vite page, published to npm as `@weng-lab/gb`.
- `apps/cloud`: the Next.js site with Eve, and the cloud API server as a separate build.

## Other options

- **One `packages/server` with `local/` and `cloud/` folders.** Fewer folders, but every dependency lands in one package, so the CLI would install cloud-only libraries.
- **A finer split:** separate `commands`, `api` and `local-ui` packages. Stricter boundaries, but more folders than the team needs.
- **Shared pieces in `packages/`.** Mixes the gb app into the library folder.

## What this means

- Dependency rules: `apps/server` never imports a database driver, auth library or React. `apps/workspace` never imports `apps/server` except `server/commands`. Only `apps/local` and `apps/cloud` choose implementations.
- In `apps/cloud`, the Next.js code must not import the API server's code or its database and auth libraries. Enforce this with a lint rule.
- The CLI never installs Postgres, the accounts library or Next.js.
- `apps/cloud` has two build outputs: the site for Vercel and the API server for Cloud Run.
- `apps/standalone` is the old direction and gets cleaned up into `apps/cloud`.
- No root `server.ts` in `apps/cloud`, because Eve's bundler treats it as its own entry.
