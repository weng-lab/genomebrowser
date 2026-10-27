# App direction

We're building an agentic genome browser that researchers can use manually or with an integrated agent. [MVP scope](mvp.md) owns the product vision, launch scope, follow-ups, and open decisions. Agent control is central to that product; users can disable it and continue browsing manually.

The pages here provide product context and explain the repository behind it. They distinguish implemented behavior from intended behavior. GitHub issues track work and progress; these docs explain behavior, decisions, and constraints.

## Read next

- [MVP scope](mvp.md): what we're building and what comes later.
- [Sessions](sessions.md): current persistence behavior and the planned guest and copy workflows.
- [Feature boundaries](features.md): where app responsibilities live and why.
- [Agent access and control](agent-auth.md): the launch control model, authorization needs, and open implementation choices.
- [Limitations](limitations.md): known constraints and deployment gaps in the current app.

Implementation workflows belong in repository skills. Import boundaries are checked by lint; behavior belongs in schemas, runtime checks, and tests. [Feature boundaries](features.md#enforcement-and-working-guidance) links to those mechanisms.

## Web app and persistence

The app targets cloud deployment first, with Next.js in `apps/web` hosted on Vercel. Clerk owns authentication and user profiles. Next.js server-side code obtains the authenticated user ID and accesses feature-owned tables through Drizzle. Database credentials and queries stay server-side.

The browser tab owns live browser and track stores. Feature modules expose data and complete operations to UI components, hiding request lifetimes and persistence coordination. Effect manages the session lifecycle and background autosave inside the session feature, and connection, reply, and retry lifetimes inside the agent feature. The MCP server uses Hono, the MCP SDK, and explicit connection cleanup. Its lifecycle implementation is independent of the web app's use of Effect.

## MCP server

`apps/server` (`@weng-lab/mcp`) is an independent MCP server with no session persistence or database access. Agents connect to `/mcp` using Streamable HTTP. An agent calls an MCP tool; the server delivers a command over SSE to a ready browser tab. The tab executes it and posts the result back over HTTP, allowing the MCP server to reply to the agent.

Both apps import tool definitions from the private `apps/contracts` package. The MCP server registers tools from those compiled definitions; the browser does not advertise its tools dynamically. The package contains protocol schemas and types, while handlers and persistence remain with their features.

UI controls and agent commands use the same browser store actions. Loading, editing, and saving sessions must work when MCP is disconnected or unavailable.

The planned cloud deployment hosts the MCP server on Google Cloud Run. An agent controls a browser tab by session ID; limiting each user's agent to that user's own tabs requires the [proposed](agent-auth.md) authorization. A later local variant runs the MCP server locally with the same behavior.

The MCP server keeps connected tabs and their pending commands in process memory, so the agent's requests and the tab's stream must reach the same instance. This design requires a single instance; the planned Cloud Run maximum instance count is 1. Cloud Run can briefly exceed that limit, and a deployment runs old and new revisions together, so commands can fail with `NOT_CONNECTED` until the tab reconnects. Cloud Run [session affinity](https://docs.cloud.google.com/run/docs/configuring/session-affinity) does not help: it is per client and best effort, and the agent and the browser are separate clients.

The server holds a persistent SSE connection to each browser tab. Cloud Run closes it at the [request timeout](https://docs.cloud.google.com/run/docs/configuring/request-timeout), 5 minutes by default and at most 60. The tab then reconnects, possibly to another instance. Commands in flight when the stream closes fail and are not replayed.

The deployment plan uses PostgreSQL on Google Cloud SQL in production and local PostgreSQL for development, with the same Drizzle schema and migrations. Local development can use mock identity through the same server-side identity boundary. See [feature boundaries](features.md) for composition. The Next.js app uses the `pg` driver, connecting locally with a `DATABASE_URL` connection string and on Vercel through Google's Cloud SQL connector with Vercel OIDC credentials.

For current implementation and setup, see the [web app guide](../../apps/web/README.md) and [server guide](../../apps/server/README.md).

[Back to maintainer docs](../README.md)
