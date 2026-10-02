# Glossary

Part of the [architecture](README.md).

- **ACP** (Agent Client Protocol). The standard way for an app to run a coding agent such as Codex and show its conversation. The local server is the ACP client, and the coding agent is the ACP agent.
- **API server.** The Node server built from `apps/server` that owns login, data, `/mcp`, tab connections and the message bus. It runs inside the CLI (`apps/local`) and on Cloud Run (`apps/cloud`).
- **Browser session.** A saved workspace (region, tracks, highlights) stored in the database.
- **Bus.** The part of the API server that delivers a command to the instance holding the target tab, and the result back.
- **Byte-range request.** An HTTP request for part of a file (`Range: bytes=...`), answered with `206 Partial Content`. The genome browser reads BigWig and BigBed files this way.
- **CILogon.** A service that provides sign-in through university accounts over OIDC.
- **Claude Science.** Anthropic's AI workbench for scientists (beta since June 2026). A host `gb` can plug into.
- **Cloud version.** The website: Next.js on Vercel with the API server on Cloud Run. Accounts, saved sessions and the Eve chat agent.
- **Device flow** (OAuth 2.0 Device Authorization Grant, RFC 8628). A sign-in method for apps that can't easily receive a browser redirect. The app shows a short code, the user approves it on the website, and the app polls until it receives a token.
- **Eve.** Vercel's agent framework, used for the cloud chat agent.
- **Launch token.** A random token the CLI prints at startup. The first visit exchanges it for a login cookie; MCP clients send it with each request.
- **`LISTEN`/`NOTIFY`.** Postgres's built-in messaging. A connection listens on a named channel, and any connection can send a message to it.
- **Local version.** The `gb` CLI running on a laptop, lab server or cluster. No account needed; loads files from disk.
- **MCP Apps.** The official MCP extension that lets a server ship an interactive UI (`ui://` resources) that hosts render inside the conversation.
- **MCP** (Model Context Protocol). The standard way to offer tools to AI agents. The API server's `/mcp` endpoint is the app's MCP server.
- **`node:sqlite`.** The SQLite database engine built into Node.js. Nothing to install.
- **ORCID.** The persistent identifier most researchers have. It offers OAuth sign-in.
- **PGlite.** Postgres compiled to WebAssembly. The alternative to SQLite locally, at about 25 MB.
- **Port forwarding** (`ssh -L`). SSH carries traffic from a port on the laptop to a port or Unix socket on the remote machine.
- **Risk level.** The category a command declares (`read`, `view`, `edit`, `external`), used by agent permissions.
- **Skill.** A markdown guide an agent loads on demand to learn how to do a task, such as using `gb`'s tools well.
- **SSE** (server-sent events). A long-lived HTTP response the server writes events into. Tabs use one to receive commands.
- **Tab.** A live browser connection showing one browser session.
- **Workspace.** The genome browser, chat panel and controls, in `apps/workspace` and shared by the website and the CLI.
