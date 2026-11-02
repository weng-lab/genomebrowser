# Genome browser agent

The Eve agent lives here; the Next.js app hosts its HTTP routes and renders chat from Eve's `SessionStore`. It uses the existing MCP server to navigate to explicit coordinates and export an image. Optional Eve sandbox tools are disabled.

## Run locally

Sign in to ChatGPT locally with `codex login`, then run `pnpm dev` from the repository root. Without an AI Gateway key, local development uses that login through Eve's `chatgpt()` provider. Without Codex, run `pnpm --filter @weng-lab/agent exec eve dev` and select ChatGPT Subscription from `/login`. Next.js starts Eve through `withEve`; Turbo starts MCP alongside it. Open a browser session, enable remote control in Settings, and open the Agent panel. Try “Hello”, then “Navigate to chr1:1001-2000” or “Export an SVG image”.

The model is selected at runtime in `agent/agent.ts`. A nonempty `AI_GATEWAY_API_KEY` selects `openai/gpt-6-luna` through Vercel AI Gateway. Set this server-only variable in `apps/web/.env.local` for local use or in the Vercel project's Preview/Production environment. Production builds also select Gateway without an explicit key, allowing Vercel OIDC authentication; they never fall back to a local login. Local development without a key uses `chatgpt("gpt-6-luna-fast")`. Provider selection does not enable hosted access: the development-only channel authorization and loopback MCP setup still need a deployment design. Eve is pinned to `1.0.0-rc.1`; its installed documentation is in `node_modules/eve/docs/`. `GB_SERVER_URL` selects the MCP server and defaults to `http://127.0.0.1:3001`.

Each chat supplies its browser session ID in an HTTP header. The local channel validates it, and the MCP connection supplies it as an argument hidden from the model. Switching browser sessions starts a new chat and requests cancellation of the old turn. Chat is ephemeral in the panel; Eve keeps local runtime data in its ignored directories. Closing the panel only collapses it, preserving the conversation. Navigating away unmounts chat and requests cancellation.

Stop requests cooperative cancellation. Already-applied browser changes remain. Disabling remote control also disconnects the tab and prevents further commands while it is off.

## Development boundary

The channel accepts local development requests only. To use an authenticated private proxy such as Tailscale Serve, set `GB_AGENT_DEV_ORIGINS` in `apps/web/.env.local` to its exact origin, including scheme and port. Restart `pnpm dev` after changing it. The agent still requires a local development runtime and a loopback connection; the proxy provides remote access control. Do not configure public proxies as trusted origins. A session ID routes calls; it is not a credential. Production requests fail closed. The MCP server remains loopback-only and unauthenticated. Hosted use needs authorization for both services before this boundary can be relaxed.

`pnpm verify` builds the agent and runs the web integration test with a scripted model, real Eve and MCP processes, the React chat hook, and the browser command handler. This requires no model credentials. The test covers chat, MCP tool execution, and application-provided session targeting; it does not evaluate model quality or a Vercel deployment.
