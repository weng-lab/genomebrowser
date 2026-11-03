# Agent and commands

Genomebrowser owns its MCP endpoint at `/api/mcp`. The embedded Eve agent and external MCP clients use that same endpoint. Browser commands run against the live stores in the connected tab; saved sessions and their autosave remain owned by the web app.

The Eve agent lives in `agent/`, next to `next.config.ts`. Next.js starts it through `withEve`, serves chat routes under `/eve/v1/*`, and renders chat from Eve's `SessionStore`. Its single `genomebrowser` MCP connection discovers the app's tools. Optional Eve sandbox tools are disabled. App code, MCP routes, and Eve ship together in each Vercel deployment.

## Run locally

Configure Clerk as described in the [web app guide](../../README.md#identity), start PostgreSQL and Redis with `pnpm web db:start`, apply migrations, and run `pnpm dev` from the repository root. Eve calls the local app at `http://localhost:3000`; override `GB_AGENT_APP_ORIGIN` when using another web port. Sign in, open a browser session and the Agent panel. Try “Hello”, “Navigate to chr1:1001-2000”, or “Export an SVG image”.

The model is selected at runtime in `agent/agent.ts`. A nonempty `AI_GATEWAY_API_KEY` selects `openai/gpt-6-luna` through Vercel AI Gateway. Set it server-side in `apps/web/.env.local` or Vercel Preview/Production. Production also selects Gateway without an explicit key, allowing Vercel OIDC authentication. Local development without a key uses `codex login` through Eve's `chatgpt("gpt-6-luna-fast")`. Eve is pinned to `1.0.0-rc.1`; its installed docs are in `node_modules/eve/docs/`.

Remote control is an account setting stored in PostgreSQL and defaults on. The tab waits for that preference before connecting. Tabs refresh it on storage notifications and window focus. MCP checks the saved preference and session ownership on every tool call.

## Connect an external agent

Configure a Streamable HTTP MCP client with the app's URL:

```json
{
  "mcpServers": {
    "genomebrowser": {
      "url": "https://YOUR_APP_HOST/api/mcp"
    }
  }
}
```

Sign in through the client's OAuth flow using your Clerk account. The app publishes OAuth protected-resource metadata at `/.well-known/oauth-protected-resource/api/mcp`, and Clerk supplies authorization, consent, token issuance and refresh. In Clerk's **OAuth applications → Settings → Client onboarding**, enable CIMD support and, for clients that need it, DCR support. Allow/default `openid`, `profile`, and `email` scopes. Configure development and production instances independently. See [Clerk's MCP guide](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server).

Each tool takes a `sessionId`: copy the UUID from the browser's `/browser/<id>` URL. Only your own sessions are authorized, and a browser tab with RC enabled must have the target session open. Session IDs are routing information, not credentials. External callers explicitly select their session; Eve supplies its conversation's session through `providedArguments`, hiding it from the model. Both clients discover the same command schemas and receive the same results/errors. Valid Clerk session bearer tokens are also accepted for programmatic testing; browser cookies alone do not authorize the MCP endpoint.

Vercel Deployment Protection is separate from Clerk. Protected previews require the external client to pass that deployment gate as well; app OAuth does not bypass it. Eve sends the project's Vercel OIDC token in the trusted-source header when calling its own protected deployment, independently of user authorization.

## Browser attachment and interruption

Opening a session creates a fresh attachment and supersedes its previous attachment immediately. Re-enabling RC also creates a fresh attachment. The previous tab stops its connection, cancels browser work, and unmounts its chat, requesting cancellation of the active turn. It remains available for manual browsing and normal autosave. Reload it to create a new attachment and take control again. Automatic reconnects retain the same attachment identity and cannot steal control back after supersession. Attachment identities are remembered for 24 hours.

An attachment ends when its session closes, is replaced or deleted, the account changes, RC is disabled locally, or its edits can no longer be saved. A command arriving after session replacement fails with `SESSION_CLOSED`. Transient disconnections reconnect; commands are never replayed. Already-applied edits stay applied even if a reply is lost.

Each chat is ephemeral and bound to its original browser session. Switching sessions starts a new chat and cancels the old turn. Collapsing the panel preserves chat; navigating away, closing/replacing a session, signing out, disabling RC, or supersession unmounts it and requests cancellation. Persistent chat is outside this implementation.

Eve and MCP clients negotiating the 2026 protocol cancel an active HTTP call by closing its request. Legacy clients that only send a separate cancellation notification cannot cancel across stateless function instances; their browser commands remain bounded by the five-second deadline.

Stop requests cooperative cancellation. The relay notifies the tab to abort a running command, such as PNG export, before showing a preview. Already-applied changes remain. Immediate account-wide revocation of every existing stream and model turn is not implemented.

## Define a command once

1. Define `features/agent/commands/<name>.ts` with `defineCommand`: snake_case `name`, agent-facing `description`, Zod `params` and `result`, and `run(app, params, signal)`.
2. List it in `commands` in `features/agent/commands/index.ts`.

That definition is the browser executor and MCP tool contract. MCP publishes every entry automatically, and Eve discovers the tools remotely; no per-command Eve file or second implementation is needed. For example, `setRegion.ts` calls `app.stores.useBrowserStore.getState().setRegion(region)` and returns the actual normalized region and whether it was clamped.

`run` returns `{ ok: true, value }` or `{ ok: false, code, error }`. Synchronous edits finish before the returned promise yields. Asynchronous actions must check cancellation before user-visible effects. The MCP adapter owns authorization, delivery, result validation and protocol errors; command definitions do not know about Redis, HTTP, Clerk, or Eve.

Command files import Zod, other app modules allowed by feature boundaries, and types. Lint rejects runtime React/browser-package imports. DOM work goes through `CommandApp` actions, implemented where `RemoteControl.tsx` builds the app. Test commands through `runCommand` or the tab integration tests. MCP discovery tests ensure the published tool list matches the registry.

## Delivery and authorization

A browser opens `/api/sessions/<id>/commands?tab=<attachment UUID>` as an SSE stream and posts replies to the same route. The current transport remains SSE plus HTTP. Both routes require the signed-in owner. MCP is Streamable HTTP, a separate protocol from this browser attachment transport.

MCP checks identity, session ownership, and RC, then calls the relay's `dispatch(sessionId, command, signal)`. The relay sends a unique command ID and five-second deadline to the current connection through Redis pub/sub. The browser validates and executes it and posts a reply. MCP validates the reply with the same command definition's result schema. Normal failure results become MCP tool errors, not successful text claims.

The relay owns deadlines, cooperative cancellation, atomic connection selection, takeover, renewal and cleanup. It shares a publisher and gives each operation its own subscriber, destroyed on completion. Stop/deadline completion never waits for Redis cleanup. Unavailable Redis never queues commands for replay. The stream lasts at most one Vercel invocation, then reconnects. A stale stream cannot receive commands published to its replacement or release the replacement's lease.

Redis keys/channels are prefixed by `VERCEL_DEPLOYMENT_ID` (or `VERCEL_URL`), isolating old/new previews and production. Local development defaults to `local`; use `GB_AGENT_NAMESPACE` when running multiple local checkouts against the same Redis. Redis carries commands, replies, bounded attachment metadata, short-lived MCP credentials and conversation access bindings; it is not the browser state store.

Eve's channel delegates Clerk identity, browser-session ownership and RC to `/api/sessions/:id/agent-auth` on the same app deployment. Destinations come from configuration, never caller headers. The verified user/session identity supplies an expiring, session-scoped app credential for the MCP connection. Raw Clerk cookies/tokens are not saved in the agent's identity or supplied to its model. Every MCP tool still checks current ownership and RC. Owners may Stop a pinned conversation after disabling RC or deleting its saved session.

Eve supplies no conversation ACL, so the app pins each conversation to its verified user/session in Redis. Every subsequent message, stream, and control checks it. Bindings expire after 24 hours; reload the page to start a new ephemeral conversation. Missing records deny access. No chat history or workflow state is stored there.

## Verification

Set `GB_TEST_REDIS_URL` and `GB_TEST_DATABASE_URL` to exercise the real boundaries. Tests use a scripted model, a real Eve process and MCP connection, the app's MCP endpoint, Clerk verification with locally signed tokens, PostgreSQL, Redis, and actual browser stores. Separate external MCP tests discover/invoke tools and check ownership, RC, session-scoped credentials, invalid credentials and cancellation. Attachment tests cover new-tab takeover and rejection of superseded retries. No model credentials are needed. These checks do not establish live model quality, an interactive Clerk OAuth login, or Vercel Deployment Protection behavior.

[Back to the docs home](../README.md)
