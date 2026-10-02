# Integrations

Part of the [architecture](README.md). Status: **Draft**, a direction to work toward.

## Purpose

How `gb` works with other AI tools: as a genome browser inside agent apps such as Claude, Codex and Claude Science, and as a host whose own agents use other MCP servers.

## Positioning

General AI workbenches for science now exist. [Claude Science](https://www.anthropic.com/news/claude-science-ai-workbench) (beta since June 2026) runs agents on laptops, clusters and over SSH, renders "genome browser tracks" among many artifact types, and supports custom connectors.

`gb` doesn't compete with them as a workbench. It aims to be **the genome browser for any AI workbench**: a full genome browser (configurable tracks, saved sessions, our lab's datasets) that works with any agent, or none, and is open source. Workbenches are a way to reach users, not rivals.

Everything here builds on the existing design. MCP is already the only agent API ([decision 0002](decisions/0002-mcp-is-the-only-agent-api.md)), so any MCP host can already drive `gb`.

## `gb` inside other agent tools

### As an MCP server

| Host | Local `gb` | Cloud `gb` |
| --- | --- | --- |
| Claude Code, Codex CLI | `gb mcp`, or `http://127.0.0.1:<port>/mcp` with the launch token | `/mcp` with MCP OAuth |
| Claude Desktop | `gb mcp` as a local command | Custom connector with MCP OAuth |
| claude.ai on the web, ChatGPT | Not reachable (see below) | Custom connector with MCP OAuth |
| Claude Science | To check: local and SSH connectors | To check |
| VS Code, Cursor | `gb mcp`, or the local URL | `/mcp` with MCP OAuth |

Hosts that run in the cloud connect to MCP servers from their own servers, so they can't reach a `gb` on the user's machine. Desktop apps and CLIs can. Check each host's behavior before documenting it for users.

Setup should be one command: `gb mcp config <host>` prints or writes the configuration for that host (see [remote-access.md](remote-access.md#gb-mcp-a-command-based-connection)).

### As an interactive view (MCP Apps)

[MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) is the first official MCP extension (January 2026). A tool declares a UI resource (`_meta.ui.resourceUri` pointing to a `ui://` resource with bundled HTML and JavaScript). The host renders it in a sandboxed frame inside the conversation and talks to it over JSON-RPC. Hosts that support it include Claude on the web and desktop, ChatGPT, Goose and VS Code.

For `gb`, this means the genome browser can appear inside the chat:

```
user in Claude: "show me H3K27ac around MYC"
  → Claude calls gb's show_browser tool
  → the host renders ui://gb/workspace in the conversation
  → the user sees and uses a real genome browser in the chat
  → later tool calls (set_region, add_track) update that view
```

How it fits the design:

- **The workspace already builds to static files** for the CLI ([decision 0008](decisions/0008-shared-workspace-package.md)). The same bundle, or a trimmed one, becomes the `ui://` resource.
- **The embedded view is a tab** of a `gb` browser session, just inside a host's frame. The browser tab still owns state ([decision 0001](decisions/0001-browser-tab-owns-state.md)), and the embedded view and the full app show the same session.
- **An "Open in gb" button** opens the same session in the full app.

Problems to solve:

- **Sandbox network access.** Track data comes from data hosts, and local files come from the `gb` server. The host's sandbox must allow those requests. MCP Apps lets a server declare the domains its UI needs, but each host decides what it allows.
- **Auth in a frame.** Browsers block third-party cookies in frames, so the embedded view can't rely on the login cookie. The `show_browser` tool result passes a short-lived token for that session instead.
- **Size.** The workspace bundle includes the genome browser and its dependencies. Hosts may limit resource size.
- **Host differences.** Hosts implement the extension at different speeds. Test each one.

### A skill for agents

A short skill (a markdown guide agents load on demand) that teaches agents to use `gb` well:

- look up genes from the loaded gene track before navigating, instead of guessing coordinates
- summarize a track's signal before highlighting
- prefer one bulk change over many single ones
- respect permission prompts and explain refusals

Skills work in Claude Code, Claude Science and other hosts that support them. It is a few hours of work and makes every agent better at using `gb`. Publish it with the CLI package.

## `gb` agents using other MCP servers

The other direction: agents inside `gb` (ACP agents locally, Eve cloud) use existing MCP servers for databases and tools, such as Ensembl, UniProt, PubMed or a lab's own tools.

- **ACP agents (local).** When `gb` creates an ACP session, it already passes `gb`'s own MCP server. It can also pass MCP servers the user has added in `gb`'s settings.
- **Eve (cloud).** Eve connections to a curated set of public scientific MCP servers, defined in `agent/connections/`.
- **Permissions.** [Agent permissions](agents-and-tools.md#agent-permissions) only govern `gb`'s own tools. Other servers' tools follow the agent's and that server's own rules. Treat text coming from them as untrusted (see [prompt injection](agents-and-tools.md#prompt-injection)).

## Open questions

Each question has a default. Build with the default unless it changes.

### INT-1. Which hosts come first?

- **Local hosts first: Claude Code, Codex CLI and Claude Desktop, through `gb mcp` (default).** Matches the local-first plan and needs no cloud infrastructure.
- Cloud hosts (claude.ai on the web, ChatGPT) first. Bigger audience, but they need the cloud site and MCP OAuth.

### INT-2. How does the embedded view get its state?

- **It is a normal tab of a `gb` browser session (default).** Same command flow as the full app, and the session stays consistent everywhere.
- It holds its own state, updated only through the host's tool results. Works without network access to `gb`, but the view and the full app can drift apart.

### INT-3. What if a host's sandbox blocks track data or the `gb` server?

- **Declare the needed domains, test each host, and show an "Open in gb" link when blocked (default).**
- Proxy all data through the `gb` server so the frame only talks to one origin. More reliable, but large files then pass through our server.

### INT-4. When do we build the MCP App?

- **A small experiment once milestone 1 is done, the real version after the local product ships (default).** The workspace already builds to static files, so an early test is cheap.
- Only after the cloud site exists.

### INT-5. Does Claude Science support local connectors and MCP Apps?

- **Find out with the beta before planning around it (default).**

### INT-6. Which outside MCP servers do `gb` agents get?

- **Users add their own in local settings; cloud Eve gets a short curated list (default).**
- A built-in catalog in both. More useful out of the box, more to maintain.
