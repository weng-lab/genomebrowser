# Web app

`@weng-lab/web` is the Next.js genome browser application: saved sessions in PostgreSQL, accounts in Clerk, and an MCP endpoint through which AI agents control the open session.

```mermaid
flowchart TD
  User([User])
  Agent([AI agent])
  Client(Web client)
  subgraph Next[Next.js server]
    MCP[MCP endpoint]
    Sessions[Session routes]
    Service[Session service]
    Events[Events route]
    Commands[Commands route]
  end
  Redis[(Redis)]
  DB[(PostgreSQL)]
  Files[(Remote genomic files)]
  Clerk[Clerk]
  User -->|uses| Client
  Agent -->|calls tool| MCP
  MCP -->|runs state tool| Service
  Client -->|sends edits| Sessions
  Sessions -->|merges edits| Service
  Service -->|stores snapshot| DB
  Service -->|publishes revision| Redis
  Redis -->|delivers revision| Events
  Events -->|streams revision| Client
  MCP -->|relays browser-only tool| Redis
  Redis -->|delivers command| Commands
  Commands -->|pushes command| Client
  Client -->|reads track files| Files
  Client -->|signs in| Clerk

  classDef actor stroke-width:2px,stroke-dasharray:5 3
  classDef frontend stroke-width:3px
  class User,Agent actor
  class Client frontend
  linkStyle 3,4,5,6,7,8 stroke-width:3px
```

PostgreSQL holds the authoritative session. Tabs send their edits as section patches, the session service merges them, and Redis carries a revision hint to every open tab of the session, which then fetches the latest state. Agent state tools (`set_region`, `list_tracks`, `sort_tracks`, `set_track_metadata`) take the same path, so they work with any number of tabs open, including none. Browser-only tools (`export_image`, `add_tracks_from_urls`, `take_control`, `release_control`) still reach one tab through Redis and the command stream, and the tab's reply takes the same route back. Requests and streams can be on different server instances, which is why Redis sits between them. [ADR 0008](../../docs/adr/0008-server-authoritative-live-sessions.md) records the design.

## Run locally

You need Node.js 24 or newer and Docker. From the repository root:

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
pnpm web db:start
pnpm web db:migrate
pnpm dev
```

Before `pnpm dev`, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `apps/web/.env.local` to the Clerk development instance's `pk_test_` and `sk_test_` keys. Get them from the Clerk Dashboard or a project maintainer. Without them every request fails. `.env.example` describes the other variables.

Open `http://localhost:3000/browser`. The dev and start scripts bind to `localhost` on purpose: Clerk rejects the request URLs Next.js produces for `127.0.0.1`, so connect through `localhost` when tunneling.

`pnpm dev` also starts the Eve agent behind the AI Assist panel with `eve dev --resume`, so a session's agent conversation survives restarting the dev server. Set `GB_EVE_DEV_PORT` to pin its port.

`pnpm web db:start` runs PostgreSQL and Redis from `compose.yaml`, matching the defaults in `.env.example`. `pnpm web db:stop` stops them. Without `REDIS_URL`, an in-memory bus keeps tabs in sync within one server process, so sessions load, save, and sync without Redis; AI Assist and browser-only tools need it.

## Database changes

After changing a table in `features/*/server/table.ts`, run `pnpm web db:generate` and commit the new files in `drizzle/`. Builds never run migrations.

## Tests

`pnpm web test` runs the app's tests. Database tests are skipped unless `GB_TEST_DATABASE_URL` is set, and relay and MCP tests are skipped unless `GB_TEST_REDIS_URL` is set. CI always runs them. With the compose services:

```sh
GB_TEST_DATABASE_URL=postgres://genomebrowser:genomebrowser@127.0.0.1:5432/postgres \
GB_TEST_REDIS_URL=redis://127.0.0.1:6379 \
pnpm web test
```

### Agent evals

`evals/` holds model evals of the agent's judgment. They stub every browser tool, but the agent still lists its tools from the app, so start `pnpm dev` with Redis running, then run `pnpm web eval` from the repository root. They call the real model, so they cost tokens and are not part of `pnpm verify`; use `--repeat` to see how stable a result is.

## Design gallery

`pnpm web design` serves the shared components in `shared/ui/` at `http://localhost:3100`, without sign-in or a database.

## Connect an MCP client

The endpoint is `http://localhost:3000/api/mcp`. Send the session owner's Clerk session token as `Authorization: Bearer <token>`, and pass the session ID from the browser URL as `sessionId`. Remote control must be on in Settings; browser-only tools also need a tab with the session open.

## Deploy

[Deployment](docs/deployment.md) lists the services each environment uses and how to connect them.
