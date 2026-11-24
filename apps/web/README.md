# Web app

`@weng-lab/web` is the Next.js genome browser application: saved sessions in PostgreSQL, accounts in Clerk, and agent commands delivered to browser tabs through an MCP endpoint and Redis.

```mermaid
flowchart TB
  subgraph Actors
    User([Researcher])
    Agent([AI agent, an MCP client])
  end

  subgraph Browser[Browser tab]
    App[Genome browser app<br/>live browser and track stores]
  end

  subgraph Server[Next.js server]
    Routes[Session and settings routes]
    MCP[MCP endpoint]
    Stream[Command stream route]
  end

  subgraph Services[External services]
    Postgres[(PostgreSQL<br/>saved sessions, account settings)]
    Redis[(Redis<br/>command relay)]
    Clerk[Clerk<br/>accounts and sign-in]
    Files[Track file hosts<br/>BigWig, BigBed, BAM]
  end

  User -->|browses and edits| App
  Agent -->|tool calls| MCP

  App -->|loads and autosaves sessions| Routes
  App <-->|receives commands, sends replies| Stream
  App -->|reads track data directly| Files
  App -->|signs in| Clerk

  Routes -->|reads and writes| Postgres
  MCP & Stream -->|check session owner and Remote control| Postgres
  MCP <-->|commands and replies| Redis
  Stream <-->|commands and replies| Redis
  Server -->|verifies identity| Clerk
```

The browser tab owns the live browser state. The server saves and loads session snapshots and relays agent commands to the tab, which applies them to the same stores the UI uses. Track data goes straight from the file hosts to the tab, never through the server.

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

`pnpm web db:start` runs PostgreSQL and Redis from `compose.yaml`, matching the defaults in `.env.example`. `pnpm web db:stop` stops them. Sessions save without Redis; only remote control and MCP need it.

## Database changes

After changing a table in `features/*/server/table.ts`, run `pnpm web db:generate` and commit the new files in `drizzle/`. Builds never run migrations.

## Tests

`pnpm web test` runs the app's tests. Database tests are skipped unless `GB_TEST_DATABASE_URL` is set, and relay and MCP tests are skipped unless `GB_TEST_REDIS_URL` is set. CI always runs them. With the compose services:

```sh
GB_TEST_DATABASE_URL=postgres://genomebrowser:genomebrowser@127.0.0.1:5432/postgres \
GB_TEST_REDIS_URL=redis://127.0.0.1:6379 \
pnpm web test
```

## Design gallery

`pnpm web design` serves the shared components in `shared/ui/` at `http://localhost:3100`, without sign-in or a database.

## Connect an MCP client

The endpoint is `http://localhost:3000/api/mcp`. Send the session owner's Clerk session token as `Authorization: Bearer <token>`, and pass the session ID from the browser URL as `sessionId`. The tab must have the session open with Remote control on in Settings.

## Deploy

See [Deploy to Vercel](docs/deployment.md).
