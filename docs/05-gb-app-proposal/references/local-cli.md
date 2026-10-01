# Local CLI (`gb`)

Part of the [architecture](README.md). Decisions: [0006](decisions/0006-sqlite-locally-postgres-cloud.md), [0008](decisions/0008-shared-workspace-package.md).

## Purpose

`gb` runs the workspace on the user's own machine or a remote server, like T3 Code. Users load their own data files ([local-files.md](local-files.md)), control the browser from their own MCP clients, and chat with a local coding agent over ACP. On a remote server, they open it from their laptop over SSH ([remote-access.md](remote-access.md)). No account is needed. Cloud sign-in and access to cloud sessions come later, after the local and cloud versions work independently.

## Commands

| Command | Does |
| --- | --- |
| `gb run [--codex \| --claude] [--cwd <dir>] [--data <dir>] [--port <n> \| --socket] [--detach]` | Starts the local server, prints the URL and launch token, opens the browser. Inside SSH, prints the forwarding command instead. |
| `gb status` | Prints the running server's URL and token |
| `gb login` | Later: signs in with a cloud account through the device flow |
| `gb logout` | Later: removes the stored cloud token |
| `gb export` | Writes local sessions to JSON |

The command set beyond `run` is a proposal. Cloud sign-in commands belong to roadmap milestone 8.

## What runs

One Node process, built from `apps/local`:

- serves the static Vite build of the workspace
- serves files from the allowed data folders with byte ranges (`/files/<id>`)
- the API, `/rpc` and `/mcp` on `127.0.0.1`
- SQLite at `~/.gb/gb.db` through `node:sqlite`
- the in-memory bus
- one ACP agent process per browser session, started on demand

If `gb` is already running, a second `gb run` reuses it instead of starting another server on the same database.

## What ships

A bundled build of `apps/local`: its server, the static Vite build of the workspace, and a small `bin` script that starts the server. No Next.js in the CLI.

## Packaging requirements

- **No native modules.** Packages like `better-sqlite3` need a compiled binary per OS and CPU, and installs break when the prebuilt binary doesn't match. `node:sqlite` is part of Node.
- **Minimum Node 22.13,** the first release with an unflagged `node:sqlite`.
- **Pinned ACP adapters.** Pin adapter packages as `gb` dependencies instead of fetching them with `npx -y` at runtime. Use `@agentclientprotocol/codex-acp` for Codex. `@zed-industries/codex-acp` is deprecated and too old for current Codex models.
- **Agents are the user's own installs.** Users need Codex or Claude Code installed and logged in. When one is missing, say which and how to install it.
- **Cross-platform.** Starting `npx` on Windows needs `npx.cmd` or a shell, and paths differ. Pick a free port automatically.
- **Local data** lives in `~/.gb/`: the database and config, with owner-only permissions. A cloud sign-in token is added with the later sign-in feature.

## Security

Covered in [identity-and-security.md](identity-and-security.md#local-server-security): `127.0.0.1` only, a required launch token, `Origin` and `Host` checks, and Approve and Deny for ACP agents.

## Risks

- **Version drift.** Users keep whatever version they installed, while the cloud site is always current. MCP tools and the cloud API must stay backward compatible.
- **Migrations on user machines.** See [sessions-and-data.md](sessions-and-data.md#risks).
- **Package size.** The workspace build includes the genome browser and its dependencies. Measure it in CI.

## Open questions

Each question has a default. Build with the default unless it changes.

### CLI-1. How does the user choose the agent?

- **`--agent <name>`, with `--codex` and `--claude` as shortcuts (default).** Quick to type for the common agents, and scales to more.
- Only per-agent flags.

### CLI-2. `npx` only, or also a global install?

- **Both (default).** It's the same package: `npx` for trying it, a global install for daily use.
- `npx` only.

### CLI-3. Package name

`gb` is already taken on npm by an unrelated tool.

- **Publish as `@weng-lab/gb`, with the command still named `gb` (default).** `npx @weng-lab/gb run`, or after `npm i -g @weng-lab/gb`, just `gb run`.
- Pick a different unscoped name.

See also the questions in [local-files.md](local-files.md#open-questions) and [remote-access.md](remote-access.md#open-questions).
