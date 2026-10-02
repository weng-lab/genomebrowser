# Agents and tools

Part of the [architecture](README.md). Decisions: [0002](decisions/0002-mcp-is-the-only-agent-api.md), [0007](decisions/0007-eve-on-vercel.md).

## Purpose

How agents act on the genome browser: the commands they can run, the MCP tools that expose them, the agents we support, and the permissions that limit them.

## Commands

Each command is declared once in `apps/server`'s command definitions (`server/commands`):

```ts
export const setRegion = defineCommand({
  name: "set_region",
  description: "Show a genomic region.",
  level: "view",
  params: z.object({ chromosome: z.string(), start: z.number().int(), end: z.number().int() }),
});
```

The workspace registers the handler that calls the genome browser stores. The MCP server builds its tool list from the definitions. Adding a tool takes one definition plus one handler.

Handlers call the genome browser library's store actions and return the library's own error when an action fails. The app does not add validation of its own.

## MCP tools

Starting tool set:

| Tool | Level | Store action | Notes |
| --- | --- | --- | --- |
| `list_sessions` | read | none | Sessions the caller can control. |
| `get_state` | read | none | The region, highlights and tracks. |
| `set_region` | view | `setRegion` | |
| `zoom` | view | `zoom` | A factor below 1 zooms in. That is the library's convention. |
| `add_highlight` | view | `addHighlight` | |
| `remove_highlight` | view | `removeHighlight` | The library ignores unknown ids, so the handler returns an error instead. |

- Tools take an optional session id that defaults to the caller's most recently active enabled session.
- Coordinates follow the genome browser library. `@weng-lab/genomebrowser` 2.0.0 uses zero-based, half-open coordinates. Newer versions move user-facing positions to one-based, so match tool descriptions to the installed version.
- Tool names and parameters must stay backward compatible, because old CLI installs and saved MCP client configs keep using them.

## Agents

### Eve (cloud)

- Runs on Vercel in the same project as the website, through `withEve()`, so the chat panel reaches it on the same domain.
- Has no genome tools of its own. Its MCP connection points at the API server's `/mcp`, and Eve discovers the tools through `connection_search`. They appear as `<connection>__<tool>`.
- Calls `/mcp` with a short-lived token for the signed-in user, passed through Eve's per-caller connection headers.
- The browser session stores the Eve conversation id, so chat history reopens with the session.
- Eve's tools run in a sandbox that can't see the user's files. Local file work belongs to ACP agents.
- Usage is capped by a daily quota per user.

### ACP agents (local)

- The local server runs one ACP agent process per browser session, such as Codex through `@agentclientprotocol/codex-acp`.
- The CLI sets the agent's working folder (`gb run --codex --cwd .`) and gives it the MCP URL and token when creating the ACP session.
- The agent's own tools (shell commands, file edits) ask for permission through ACP. The chat panel shows these with Approve and Deny.
- The agent process stops when its session closes.

### External MCP clients

Claude Desktop, Cursor, Codex and others connect to `/mcp` directly. In the cloud version, they sign in through MCP's OAuth flow. Locally, they use the launch token or the `gb mcp` command. When `gb` runs on a remote server, agents on the user's laptop connect through the SSH tunnel or with `ssh <server> gb mcp`. See [remote-access.md](remote-access.md#connecting-agents), [identity-and-security.md](identity-and-security.md) and, for specific hosts and MCP Apps, [integrations.md](integrations.md).

## Agent permissions

A direction to work toward, modeled on the tool permissions in Claude Code and Codex. It starts on a safe default. Today's tools are all `read` or `view`, so the default allows them and nothing changes for users until riskier tools exist.

### Risk levels

Every command declares a level:

| Level | Meaning | Tools (today and future) |
| --- | --- | --- |
| `read` | Looks, changes nothing | `get_state`, `list_sessions` |
| `view` | Changes what's on screen and is easy to undo | `set_region`, `zoom`, `add_highlight`, `remove_highlight` |
| `edit` | Changes saved session content | Future: add or remove tracks, change track settings, rename a session |
| `external` | Reaches outside the app | Future: fetch a URL, load a local file (`list_local_files`, `add_track` from a file), export |

Some actions never get an MCP tool, whatever the permissions: deleting sessions, sharing, account settings and changing permissions. That stops an agent from granting itself more access.

### Modes

| Mode | read | view | edit | external |
| --- | --- | --- | --- | --- |
| Read only | allow | deny | deny | deny |
| Default | allow | allow | ask | deny |
| Trusted | allow | allow | allow | ask |

Per-tool overrides refine a mode, for example "Trusted, but always ask for `remove_track`". Later, rules could match arguments, such as "allow `add_track` only from `wenglab.org`".

### Scope and enforcement

- A grant covers one agent or client (Eve, Claude Desktop, Codex) on one browser session or on all of the user's sessions.
- The API server enforces permissions in the tool pipeline, never the agent. See [api-server.md](api-server.md#tab-connections).
- Grants are stored in `agent_permissions`, and every decision is recorded in `audit_log`. See [sessions-and-data.md](sessions-and-data.md#tables).

### Asking the user

The server sends an approval request down the tab's SSE stream. The workspace shows, for example, "Claude Desktop wants to add track X" with Allow once, Allow for this session and Deny. This works for every agent, including external clients that can't show our UI.

- "Allow for this session" saves an override.
- An unanswered request expires after a couple of minutes and counts as a deny.
- With no tab open, an ask counts as a deny.
- ACP agents have two separate layers: their own tools use ACP's permission requests, and our app tools use these rules. Both prompts look the same in the chat panel.

## Prompt injection

Text the model reads can contain instructions: track labels, highlight ids, session names, and later labels inside user-uploaded files. Once sessions are shared, one user's text reaches another user's agent.

Defenses, in order:

1. Tools stay low-risk. Destructive and access-changing actions are UI-only.
2. Riskier tools go through agent permissions.
3. Optional: a fast classifier such as TypeSafe's Jev could score riskier calls (does this call fit what the user asked?) or flag returned text that reads like instructions to an AI. It may only make a decision stricter (allow to ask), never looser. It is a cloud, invite-only service, so it would sit behind a small `guard` interface with a do-nothing default, be opt-in locally, and never receive secrets such as signed track URLs.

## Open questions

Each question has a default. Build with the default unless it changes.

### AG-1. Eve's daily quota

- **50 turns per user per day, reset at midnight UTC (default).** When reached, the chat panel says so and when it resets. Tune with real usage, and switch to a cost limit if turns vary too much in cost.
- A token or cost limit from the start. More accurate, harder to explain to users.

### AG-2. Is `add_highlight` `view` or `edit`?

Highlights are saved with the session.

- **`view` (default).** Highlights are easy to remove, and asking before each one would be noisy.
- `edit`. Revisit if highlights become shared annotations.

### AG-3. What happens when several agents drive one session at once?

For example, Codex on the laptop and the chat panel agent on the server (see [remote-access.md](remote-access.md#several-agents-on-one-session)).

- **Run commands in arrival order and log who sent each (default).** Simple, and view changes are harmless.
- **One agent at a time,** with a visible "Codex is controlling this session" lock.

### AG-4. How are agents told apart for permissions?

Grants are per agent. Codex on the laptop and Codex on the server both report the name "codex".

- **The client name plus the connection it came through, shown as an editable label such as "Codex (laptop)" (default).** The user can rename it when approving.
- Only a name the user types for each connection.

### AG-5. Should loading files default to ask in local mode?

**Ask (default).** Same question as [LF-1](local-files.md#lf-1-should-agents-load-files-without-asking).
