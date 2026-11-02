# ADR 0007: The web app owns agent commands from definition to reply

- Status: accepted
- Date: 2026-11-02
- Supersedes: [ADR 0002](0002-web-owns-persistence-mcp-is-relay.md) (the MCP relay part) and [ADR 0003](0003-private-contracts-package.md)

## Context

Agent commands run in the browser tab, against its live stores. A separate MCP server relayed them: it held open tabs and pending replies in memory, so it needed one persistent instance, and it had no authorization. A private contracts package kept the server and the web app agreeing on each command. The integrated Eve agent then reached the tab through that server, adding a hop, a separate deployment, and a third place to touch for each command.

The app deploys to Vercel, where functions are short-lived and many instances can run at once, and the Eve agent runs as its own service beside Next.js. In-memory relaying cannot work there. External MCP clients remain a goal and need per-session authorization.

## Decision

- `apps/web/features/agent/commands` owns every command: one definition per command gives its name, description, parameter and result schemas, and how the tab runs it. Command files import only Zod, each other, and types, so the agent can load them on the server; browser work goes through `CommandApp`.
- The Eve agent lives in `apps/web/agent`. Each command is an Eve tool through a one-line file named after it. Tools take the session from the conversation, never from the model.
- A relay in the same module carries commands to the tab and replies back through Redis pub/sub. Redis records which tab holds each session; nothing else is stored, and commands are not replayed. Next.js routes under `/api/sessions/:id/commands` serve the tab's stream and replies and require the session's signed-in owner.
- `apps/server` and `apps/contracts` are removed. The web app still owns persistence and identity, and manual browsing works without the agent or Redis.

Considered: hosting the MCP server on Cloud Run (keeps the single-instance limit and a second platform), and Eve workflow tools that pause until the tab answers through the chat's session stream (no Redis, but Eve does not publish workflow tools to MCP clients, and an external client's call would not reach the tab).

## Consequences

Adding a command means a definition, an entry in `commands`, and a tool file; tests fail when a tool file is missing. Agent commands need Redis locally and in deployment. External MCP clients can use Eve's MCP channel with `tools: true` once each call can be authorized for a session, without another relay. The Eve chat channel still needs Clerk authentication before the panel works in production.
