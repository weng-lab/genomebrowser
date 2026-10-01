# 0012. Hono for the API server

Decided 2026-10-01.

## Why this came up

The API server needs an HTTP framework that runs on Node, holds long SSE streams, and hosts the MCP endpoint. The same code runs inside the `gb` CLI and on Cloud Run. Effect 4.0 was released the same day and was a serious candidate, because it covers HTTP, SQL, a CLI and an MCP server in one package with no dependencies.

## What we chose

Hono. It is built on web `Request` and `Response`, like the Next.js route handlers the team already writes. The official MCP SDK's web-standard transport works with it directly, command schemas stay in Zod, and Drizzle is used as decision 0006 describes.

## Other options

- **Fastify.** More established, with a larger plugin ecosystem, but its own request and response model instead of the web standard.
- **Effect 4.0.** A strong fit for the hardest server code: commands that wait on a tab with a timeout and must fail cleanly when a stream drops. Its `Layer` services match the core-plus-two-entries structure, `@effect/sql-pg` has `LISTEN`/`NOTIFY` built in, and `@effect/sql-sqlite-node` uses `node:sqlite`. We passed on it for these reasons:
  - Every module the server would use (`http`, `sql`, `rpc`, `cli`, and `ai` with its MCP server) is marked unstable, which in Effect's policy means it may break in minor releases. Only the core is stable.
  - `@effect/sql-drizzle` has no release for Effect 4, so Drizzle would sit outside Effect's SQL layer.
  - Effect's MCP tools only accept Effect Schema. Moving the command definitions from Zod would add about 75 KB gzipped to the workspace bundle, unless the workspace imports only types.
  - Effect's MCP server is new and untested with our clients. It has no GET SSE stream, resumption or authentication of its own.
  - Every contributor would need to learn Effect's style. People who can't review Effect code would lean on agents to write it, and the server would fill with code nobody on the team understands.

## What this means

- The server is plain TypeScript. `createServer` takes ordinary interfaces for the session store, bus and auth.
- Waiting on tabs needs its own small module: a map of pending calls, a timer per call, and cleanup when a tab's stream closes. It needs tests for timeouts, reconnects and deploys.
- Better Auth's Hono setup still needs confirming at the start of the cloud API server milestone (see [SEC-1](../identity-and-security.md#sec-1-does-better-auth-cover-everything-we-need)).
- Revisit Effect if two of these become true: its `http`, `sql` and `ai` modules become stable, `@effect/sql-drizzle` supports Effect 4, the server grows well beyond this design (background jobs, retries against outside services, more instances to coordinate), or the team wants to learn it.
