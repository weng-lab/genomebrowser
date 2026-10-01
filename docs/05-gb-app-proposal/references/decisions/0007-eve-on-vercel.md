# 0007. Eve stays on Vercel

Decided 2026-10-01.

## Why this came up

Eve is Vercel's agent framework. Self-hosting it requires durable storage for its workflows and a sandbox provider. Its defaults (a local folder, Docker or microsandbox) don't work on Cloud Run.

## What we chose

Eve deploys with the website in one Vercel project through `withEve()`. It reaches the app through the API server's `/mcp`. The CLI doesn't use Eve; local chat uses ACP agents.

## Other options

- **Self-host Eve on Cloud Run.** One cloud, but we would own workflow storage and sandboxing.
- **Eve in its own Vercel project.** Works, but puts it on a different domain from the chat panel and needs cross-domain auth.

## What this means

- The chat panel and Eve share a domain.
- Eve needs a short-lived per-user token to call `/mcp`.
- The CLI doesn't ship the Eve runtime.
