# Roadmap

Part of the [architecture](README.md). This is the implementation order. The design docs describe what each piece looks like; this file says when we build it.

Milestones 1 to 5 produce a complete local product, including the user's own files and remote servers, before any cloud infrastructure exists. Local and cloud sessions stay separate through milestone 7. Local cloud sign-in is a later addition in milestone 8.

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Repo layout and command definitions | Not started |
| 2 | Browser sessions and tabs (local) | Not started |
| 3 | The `gb` CLI | Not started |
| 4 | Local files | Not started |
| 5 | Remote access over SSH | Not started |
| 6 | Cloud API server | Not started |
| 7 | Cloud website with Eve | Not started |
| 8 | Local sign-in and cloud sessions | Not started |

## 1. Repo layout and command definitions

- `apps/server` (with the command definitions), `apps/workspace`, and `apps/local` with its Vite page. See [decision 0013](decisions/0013-gb-app-layout.md).
- Commands defined once, with risk levels, and the MCP tool list built from them.
- The starting tool set from [agents-and-tools.md](agents-and-tools.md#mcp-tools).

Done when: the workspace runs in the Vite shell against the local server, and an MCP client can drive it.

## 2. Browser sessions and tabs (local)

- Saved browser sessions in SQLite through `node:sqlite` and Drizzle.
- Tabs register with a session. Commands go to the most recently focused tab. State saves and broadcasts to other tabs.
- `list_sessions` and the optional session id on tools.
- The audit log.

Done when: two sessions in two tabs can each be driven by an agent, and both survive a server restart.

## 3. The `gb` CLI

- Packaging: bundled server plus the static workspace build, no native modules, Node 22.13 or later.
- Launch token, `Origin` and `Host` checks.
- ACP agents per session, with Approve and Deny in the chat panel.
- Reuse of an already-running `gb`.

Done when: `npx @weng-lab/gb run --codex` works on macOS, Linux and Windows from a clean machine.

## 4. Local files

See [local-files.md](local-files.md).

- Allowed folders (the launch folder and `--data`), path checks, the `local_files` table.
- The file picker API and picker UI.
- `/files/<id>` with byte ranges, caching headers and change detection.
- BigWig and BigBed detection, with a warning on chromosome-name mismatches.
- Portable `local-file:` references in saved sessions.

Done when: a user runs `gb` in a project folder, picks a 2 GB BigWig from the picker, and it renders; the session reopens with the track after a restart on a different port.

## 5. Remote access over SSH

See [remote-access.md](remote-access.md).

- The SSH-aware startup message with the exact `ssh -L` command.
- Launch token to cookie, with instance-named cookies.
- `--port`, `--socket` and `gb status`.

Done when: a user runs `gb` on a lab server, opens it on their laptop through `ssh -L`, and loads a file stored on the server.

## 6. Cloud API server

- The cloud API server in `apps/cloud`, on Cloud Run with Cloud SQL.
- The `LISTEN`/`NOTIFY` bus.
- Accounts with Better Auth: Google, GitHub, ORCID and email codes.
- MCP OAuth. The device flow waits until milestone 8.
- Rate limits and the per-user stream cap.

Done when: an external MCP client signs in through OAuth and drives a cloud session across two API server instances.

## 7. Cloud website with Eve

- `apps/cloud`'s Next.js site, rebuilt from `apps/standalone`, wrapping the workspace with the site pages around it.
- Eve in the same Vercel project, calling `/mcp` as the signed-in user.
- The daily Eve quota.

Done when: a signed-in user chats with Eve on the cloud site and Eve drives their session.

## 8. Local sign-in and cloud sessions

A later addition, after milestones 6 and 7 work independently of the local app. Resolve missing-file behavior and simultaneous changes from local and cloud tabs before implementation.

- The cloud device-flow endpoints, `gb login`, and the local workspace's Sign in button.
- `remoteStore`, so cloud sessions appear next to local ones. Read and save them directly through the cloud API, with no offline syncing.
- Connected devices on the account page.

Done when: a local user signs in, opens a cloud session, and drives it with Codex.

## Later

Not scheduled. Each needs its own design before work starts.

- **Agent permissions** beyond the default mode: Read only and Trusted modes, per-tool overrides, approval prompts. Needed once `edit` or `external` tools exist. See [agents-and-tools.md](agents-and-tools.md#agent-permissions).
- **A guard classifier** such as Jev for riskier tool calls.
- **A `gb` skill** that teaches agents to use the tools well. Cheap; could land alongside milestones 1 to 3. See [integrations.md](integrations.md#a-skill-for-agents).
- **`gb` as an MCP App,** rendering the workspace inside Claude, ChatGPT and VS Code. An early experiment after milestone 1. See [integrations.md](integrations.md#as-an-interactive-view-mcp-apps).
- **`gb mcp config <host>`** to set up Claude Code, Codex, Claude Desktop and others in one command.
- **Outside MCP servers** (Ensembl, UniProt, PubMed) for `gb`'s own agents.
- **Session sharing:** roles, read-only links, lab groups.
- **More file formats:** bedGraph and BED, then indexed BAM, CRAM and VCF.
- **Files on the cloud site,** through cloud storage or files read in the browser.
- **`gb run --detach`** and an idle timeout for shared machines.
- **A cloud relay** so remote `gb` instances open from the website without SSH.
- **University sign-in** through CILogon, if asked.
- **Moving sessions** between local and cloud.
- **Running commands without an open tab.**
- **Saving sessions in the browser** for anonymous cloud use.
