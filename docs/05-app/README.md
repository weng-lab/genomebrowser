# App direction

Build a browser app around saved, user-owned sessions, with optional agent control. Keep feature interfaces small so new functionality does not require understanding database, request, or connection wiring.

This section records the agreed target architecture. The browser saves sessions through owner-checked Next.js routes on Drizzle and PostgreSQL. `apps/server` still contains its old persistence, now unused, and MCP has not been separated yet. [Implementation order](implementation.md#progress) tracks what has landed. These pages guide the refactor; app READMEs describe current setup.

## Read next

- [Sessions](sessions.md): saved data, immutable assembly, and background autosave.
- [Feature boundaries](features.md): Clerk identity, dependency injection, assemblies, and tracks.
- [Implementation order](implementation.md): bounded work for implementation threads and remaining decisions.

## Web app and persistence

The app targets cloud deployment first, with Next.js in `apps/web` hosted on Vercel. Clerk owns authentication and user profiles. Next.js server-side code obtains the authenticated user ID and accesses feature-owned tables through Drizzle. Database credentials and queries stay server-side.

The browser tab owns live browser and track stores. Feature modules expose data and complete operations to UI components, hiding request lifetimes and persistence coordination. Effect manages background async work inside those modules.

## Optional MCP server

`apps/server` becomes an independent MCP server with no session persistence or database access. An agent calls an MCP tool; the server delivers a command over SSE to a ready browser tab. The tab executes it and posts the result back over HTTP, allowing the MCP server to reply to the agent.

UI controls and agent commands use the same browser store actions. Loading, editing, and saving sessions must work when MCP is disconnected or unavailable. The server needs hosting that supports persistent SSE connections.

Use PostgreSQL on Google Cloud SQL in production and local PostgreSQL for development, with the same Drizzle schema and migrations. Local development can use mock identity through the same server-side identity boundary. See [feature boundaries](features.md) for composition. The server uses the `pg` driver with a `DATABASE_URL` connection string. The MCP hosting provider still needs selection.

For current implementation and setup, see the [web app guide](../../apps/web/README.md) and [server guide](../../apps/server/README.md).

[Back to maintainer docs](../README.md)
