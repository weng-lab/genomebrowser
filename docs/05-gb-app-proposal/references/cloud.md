# Cloud deployment

Part of the [architecture](README.md). Decisions: [0004](decisions/0004-separate-api-server.md), [0005](decisions/0005-postgres-listen-notify-bus.md), [0007](decisions/0007-eve-on-vercel.md).

## Purpose

How the cloud version is deployed and how its parts connect.

## Topology

| Part | Runs on | Domain (example) |
| --- | --- | --- |
| Website (`apps/cloud`, Next.js) and Eve | Vercel, one project | `example.com` |
| API server (`apps/cloud`, separate build) | Google Cloud Run | `api.example.com` |
| Database and message bus | Cloud SQL Postgres | private |

## How the parts connect

- **Regular API calls.** A Next.js rewrite sends `/api/*` to the API server, so the browser sees one domain and the login cookie works without extra setup. Server components call the API server directly and forward the user's cookie.
- **Tab connections.** Long-lived SSE streams go straight from the browser to `api.example.com`. Vercel's rewrite proxy isn't meant for hour-long streams. A login cookie scoped to the parent domain covers both domains, with CORS on the API domain.
- **Login.** The API server owns accounts and MCP OAuth. Next.js shows the login pages but never issues sessions itself. Add the device flow and device-approval page later, when local `gb` gains cloud sign-in.
- **Eve.** In the website's Vercel project through `withEve()`, so the chat panel reaches it on the same domain. Eve calls `api.example.com/mcp` with a short-lived token for the signed-in user.
- **Database.** Only the API server connects to Cloud SQL. Next.js never does.

## Cloud Run settings

- **Minimum one instance,** to avoid cold starts.
- **Concurrency up to 1000** requests per instance (Cloud Run's maximum). Each open tab holds one request. 10k users won't all have a tab open at once, so a few instances cover peak load.
- **Request timeout 60 minutes,** Cloud Run's maximum. Tabs reconnect about hourly, and `EventSource` handles it.
- **Direct database connection** for the `LISTEN` channel on each instance, plus a small pool for queries.

## Deploying

- The website and Eve deploy to Vercel. The API server deploys to Cloud Run. They deploy independently.
- A website deploy can briefly run against an older API server, or the reverse. Keep API and MCP changes backward compatible.
- Every API server deploy drops all open streams. Tabs reconnect, and commands in flight fail with a clear error.
- Eve treats a `server.ts` at the root of its app as its own server entry. Don't put one there.

## Cost

Expect one always-on Cloud Run instance plus a few at peak, and a small Cloud SQL instance at tens of dollars a month. Model usage through Eve will likely cost more than all the infrastructure combined, which is why Eve has a per-user quota.

## Risks

- **Cross-domain setup.** The parent-domain cookie and CORS must be right for the SSE streams to authenticate.
- **Two platforms.** Logs, alerts and secrets live in both Vercel and GCP.

## Open questions

Each question has a default. Build with the default unless it changes.

### CLOUD-1. Domain names

The site and the API need sibling subdomains of one parent domain for the shared login cookie.

- **Decide before the cloud milestones, using `<name>.org` for the site and `api.<name>.org` for the API (default).**

### CLOUD-2. A web application firewall in front of the API server?

- **No at launch (default).** Rate limits in the API server are enough. Add Cloud Armor if abuse shows up.
- Cloud Armor from the start.
