# App direction

Build a browser app around saved, user-owned sessions, with optional agent control. Keep feature interfaces small so new functionality does not require understanding database, request, or connection wiring.

This section records the implemented architecture and the decisions that guide further work. The browser saves sessions through owner-checked Next.js routes on Drizzle and PostgreSQL. `apps/server` is a database-free MCP server with one region tool. [Implementation status](implementation.md) records completion and deferred scope. App READMEs describe setup.

## Read next

- [Sessions](sessions.md): saved data, immutable assembly, and background autosave.
- [Feature boundaries](features.md): Clerk identity, dependency injection, assemblies, and tracks.
- [Agent authentication](agent-auth.md): proposed authorization for external MCP clients, the Eve panel, and user-scoped tools.
- [Implementation status](implementation.md): completion, design constraints, and deferred scope.
- [Limitations](limitations.md): current constraints and deployment gaps.

## Web app and persistence

The app targets cloud deployment first, with Next.js in `apps/web` hosted on Vercel. Clerk owns authentication and user profiles. Next.js server-side code obtains the authenticated user ID and accesses feature-owned tables through Drizzle. Database credentials and queries stay server-side.

The browser tab owns live browser and track stores. Feature modules expose data and complete operations to UI components, hiding request lifetimes and persistence coordination. Effect manages the session lifecycle and background autosave inside the session feature, and connection, reply, and retry lifetimes inside the agent feature. The MCP server uses Hono, the MCP SDK, and explicit connection cleanup; adopting Effect there is not a requirement. Use it where it simplifies coordinated async lifetimes, without exposing that wiring to callers.

## Optional MCP server

`apps/server` (`@weng-lab/mcp`) is an independent MCP server with no session persistence or database access. Agents connect to `/mcp` using Streamable HTTP. An agent calls an MCP tool; the server delivers a command over SSE to a ready browser tab. The tab executes it and posts the result back over HTTP, allowing the MCP server to reply to the agent.

Both apps import tool definitions from the private `apps/contracts` package. The MCP server registers tools from those compiled definitions; the browser does not advertise its tools dynamically. The package contains protocol schemas and types, while handlers and persistence remain with their features.

UI controls and agent commands use the same browser store actions. Loading, editing, and saving sessions must work when MCP is disconnected or unavailable.

For the cloud variant, host the MCP server on Google Cloud Run so a user's agent talks directly to that user's own browser tab through it. A later local variant runs the MCP server locally, with the same agent-to-own-tab behavior. User authorization is still [proposed](agent-auth.md).

The tab registry in [`apps/server/src/tabs.ts`](../../apps/server/src/tabs.ts) is an in-memory map keyed by session ID, holding each connected tab's pending commands and removing its entry on disconnect. Cloud Run must use a single instance (max instances 1) or session affinity that routes the agent's requests and the tab's SSE connection and replies to the same instance, because other instances cannot access that tab's registry entry. Cloud Run [session affinity](https://docs.cloud.google.com/run/docs/configuring/session-affinity) is cookie-based and best effort; enabling it alone does not coordinate the separate agent and browser clients.

The server still requires persistent SSE connections to browser tabs. Cloud Run supports [SSE streaming responses](https://cloud.google.com/blog/products/serverless/cloud-run-now-supports-http-grpc-server-streaming) within its [request timeout](https://docs.cloud.google.com/run/docs/configuring/request-timeout); the browser reconnects when the stream closes.

Use PostgreSQL on Google Cloud SQL in production and local PostgreSQL for development, with the same Drizzle schema and migrations. Local development can use mock identity through the same server-side identity boundary. See [feature boundaries](features.md) for composition. The Next.js app uses the `pg` driver with a `DATABASE_URL` connection string.

For current implementation and setup, see the [web app guide](../../apps/web/README.md) and [server guide](../../apps/server/README.md).

[Back to maintainer docs](../README.md)
