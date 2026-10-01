# 0006. SQLite through node:sqlite locally, Postgres cloud

Decided 2026-10-01.

## Why this came up

The CLI should stay small and install on any OS without compiling anything. The cloud version needs a server database.

## What we chose

Locally, SQLite through `node:sqlite`, which is built into Node. In the cloud version, Cloud SQL Postgres. Both through Drizzle, with two schema files and two sets of migrations.

## Other options

- **PGlite locally.** Postgres in WebAssembly, so one schema for both, but about 25 MB unpacked.
- **`better-sqlite3`.** Mature, but a native module (about 27 MB unpacked) that needs a prebuilt binary per OS and CPU.
- **SQLite WebAssembly builds.** `node-sqlite3-wasm` is about 1.3 MB and can write files. `@sqlite.org/sqlite-wasm` is about 3 MB but has no file storage in Node. `sql.js` is about 24 MB and needs manual saving.

## What this means

- Zero added package size for the database, and no native install problems.
- Two schemas must be kept in step, with tests against both.
- `node:sqlite` is still marked as under development in Node, so direct calls stay in one adapter file.
- Minimum Node version for the CLI is 22.13.
- Revisit PGlite if keeping two schemas in step becomes a burden.
