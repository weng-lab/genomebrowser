# Web app

`@weng-lab/web` is the Next.js genome browser application: saved sessions in PostgreSQL, accounts in Clerk, and an MCP endpoint through which AI agents control the open session.

```mermaid
flowchart TD
  User([User])
  Agent([AI agent])
  Client(Web client)
  subgraph Next[Next.js server]
    MCP[MCP endpoint]
    Commands[Commands route]
    Sessions[Session routes]
  end
  Redis[(Redis)]
  DB[(PostgreSQL)]
  Files[(Remote genomic files)]
  Clerk[Clerk]
  User -->|uses| Client
  Agent -->|calls tool| MCP
  MCP -->|publishes command| Redis
  Redis -->|delivers command| Commands
  Commands -->|pushes command| Client
  Client -->|saves session| Sessions
  Sessions -->|stores snapshot| DB
  Client -->|reads track files| Files
  Client -->|signs in| Clerk

  classDef actor stroke-width:2px,stroke-dasharray:5 3
  classDef frontend stroke-width:3px
  class User,Agent actor
  class Client frontend
  linkStyle 1,2,3,4 stroke-width:3px
```

An agent's command reaches the web client only through Redis and the command stream, and the client's reply takes the same route back. The MCP call and the client's stream can be on different server instances, which is why Redis sits between them. The client applies commands to the same stores the UI uses.

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

[Deployment](docs/deployment.md) lists the services each environment uses and how to connect them.
