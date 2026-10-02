# 0002. MCP is the only API for agents

Decided 2026-10-01.

## Why this came up

Several agents need the same capabilities: Eve on the cloud site, coding agents over ACP locally, and external MCP clients such as Claude Desktop.

## What we chose

All agents use the API server's MCP tools. No agent gets agent-specific tools or a private route to the browser. Eve consumes our MCP server as a connection instead of defining its own tools.

## Other options

- **Eve-specific tools.** Faster to write for Eve alone, but every capability would exist twice and drift.
- **Eve sending commands down its chat stream to the tab.** Saves one hop, but only reaches the tab you are chatting from, and external clients still need the server path, so commands would have two routes. Eve also has no client-side tool feature; its ask-the-user mechanism would have to be bent to carry commands.

## What this means

- A tool is written once and works for every agent.
- Permissions, access checks and the audit log apply to every agent in one place.
- Every agent call goes through the API server, which adds a few milliseconds.
