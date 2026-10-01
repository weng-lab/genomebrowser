# 0004. A separate API server, with Next.js as the UI layer

Decided 2026-10-01.

## Why this came up

The cloud site should use Next.js like our other sites. The CLI needs a long-running local server. Tab connections are long-lived, which serverless functions handle badly, and an early prototype needed workarounds to share state between Next.js route handlers.

## What we chose

A plain Node API server owns login, the database, sessions, `/mcp`, tab connections and the bus. It runs in the CLI locally and on Cloud Run cloud. Next.js on Vercel is the UI layer and never touches the database.

## Other options

- **Everything in Next.js on Vercel.** Needs Redis or similar to connect serverless instances, holds hour-long streams in functions, and differs from the CLI's server.
- **Everything in one container on Cloud Run, including Next.js.** One deployment, but gives up Vercel for the site and puts Eve on a different domain from the chat panel.
- **Next.js on Vercel talking to the database directly.** Two places with database and auth logic, and Vercel needs a connection to Cloud SQL.

## What this means

- Local and cloud run the same server code, with different plug-ins.
- Two deployments (Vercel and Cloud Run) must stay compatible.
- The cloud site has two domains, joined by a parent-domain cookie and a `/api` rewrite.
