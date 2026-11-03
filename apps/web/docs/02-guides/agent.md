# Agent and commands

The Eve agent lives in `agent/`, next to `next.config.ts`. Next.js starts it through `withEve`, serves its routes under `/eve/v1/*`, and renders chat from Eve's `SessionStore`. Its tools are the app's commands: each runs in the browser tab where the conversation's session is open. Optional Eve sandbox tools are disabled.

## Run locally

Start Redis with `pnpm web db:start`, sign in to ChatGPT locally with `codex login`, then run `pnpm dev` from the repository root. Without an AI Gateway key, local development uses that login through Eve's `chatgpt()` provider. Without Codex, run `pnpm --filter @weng-lab/web exec eve dev` and select ChatGPT Subscription from `/login`. Open a browser session and open the Agent panel. Try “Hello”, then “Navigate to chr1:1001-2000” or “Export an SVG image”.

The model is selected at runtime in `agent/agent.ts`. A nonempty `AI_GATEWAY_API_KEY` selects `openai/gpt-6-luna` through Vercel AI Gateway. Set this server-only variable in `apps/web/.env.local` for local use or in the Vercel project's Preview/Production environment. Production builds also select Gateway without an explicit key, allowing Vercel OIDC authentication; they never fall back to a local login. Local development without a key uses `chatgpt("gpt-6-luna-fast")`. Provider selection does not enable hosted access: the development-only channel authorization still needs a deployment design. Eve is pinned to `1.0.0-rc.1`; its installed documentation is in `node_modules/eve/docs/`.

Remote control is an account setting stored in PostgreSQL. It defaults on; Settings saves changes for the signed-in user. The tab waits for that preference before connecting. Same-browser tabs refresh it on a storage notification, and tabs refresh on window focus. Command routes reject new connections and replies while it is off.

Each chat supplies its browser session ID in an HTTP header. The channel validates it and records it on the Eve session, and every command tool reads it from there, so the model cannot target another session. Switching browser sessions starts a new chat and requests cancellation of the old turn. Chat is ephemeral in the panel; Eve keeps local runtime data in its ignored directories. Closing the panel only collapses it, preserving the conversation. Navigating away unmounts chat and requests cancellation. Closing or replacing the session, signing out, or disabling remote control also unmounts chat and cancels its active turn.

Stop requests cooperative cancellation. The relay tells the tab to cancel a command still running, such as an export, which then shows no preview. Already-applied browser changes remain. Disabling remote control also disconnects the tab and prevents further commands while it is off.

## How a command runs

`features/agent/commands` owns commands from definition to reply:

1. A command's tool sends it through the relay to the session's tab, with a `commandId` and an expiry five seconds away.
2. The tab's stream route receives it from Redis and forwards it over SSE. The tab validates the parameters and runs the command against its open session.
3. The tab posts its result to the same route, which publishes it to the waiting tool. The tool checks it against the command's `result` schema and returns it to the model, or fails with `CODE: message`.

The agent and Next.js may run in different processes, so the relay passes commands and replies through Redis pub/sub rather than memory. It stores nothing; a command no tab receives fails at once. Callers use `dispatch(sessionId, command, signal)`, `connect(sessionId, tabId, signal)`, and `acknowledge(sessionId, reply)`; the relay owns subscription ordering, deadlines, cancellation, and tab leases.

One Redis publisher is shared per relay. Each pending command and tab stream owns a dedicated subscriber, destroyed when that operation ends. This costs a connection per pending command, but completion never depends on a shared subscriber or an `UNSUBSCRIBE` acknowledgement. Stop and deadlines settle locally even if Redis stops replying; cancellation delivery remains cooperative and depends on connectivity. Redis commands are not queued for replay while disconnected. `close()` ends active operations and streams and permanently closes the relay.

Command publication atomically selects the current lease holder's connection channel. An older stream can remain open until its next heartbeat, but cannot receive commands sent to its replacement.

## Add a command

1. Define it in `features/agent/commands/<name>.ts` with `defineCommand`: its snake_case tool `name`, a `description` for agents, Zod `params` and `result` schemas, and `run(app, params, signal)`. `run` makes edits synchronously through `app.stores`, or uses another `CommandApp` action, and returns `{ ok: true, value }` or `{ ok: false, code, error }`.
2. List it in `commands` in `features/agent/commands/index.ts`.
3. Add `agent/tools/<name>.ts`, which Eve names the tool after: `export default commandTool(yourCommand);`.

Command files may import Zod, other command files, and types. The agent loads them on the server, so lint rejects runtime imports of React or browser packages there. When a command needs browser work, such as exporting an image, add an action to `CommandApp` and implement it where `RemoteControl.tsx` builds the app. Test the command through `runCommand` or the tab in `test/remoteControl.test.tsx`; `test/agentTools.test.ts` fails when a command has no tool file.

## Development boundary

The channel accepts local development requests only. To use an authenticated private proxy such as Tailscale Serve, set `GB_AGENT_DEV_ORIGINS` in `apps/web/.env.local` to its exact origin, including scheme and port. Restart `pnpm dev` after changing it. The agent still requires a local development runtime and a loopback connection; the proxy provides remote access control. Do not configure public proxies as trusted origins. A session ID routes calls; it is not a credential. Production requests fail closed until the channel authenticates users with Clerk.

The tab's command stream and replies require the session's signed-in owner. External MCP clients are not connected yet; Eve's MCP channel can publish the same tools once each call can be authorized for a session.

`pnpm verify` builds the agent and runs the web integration test with a scripted model, a real Eve process, its command tools, Redis, the React chat hook, and the tab's command handling. It needs `GB_TEST_REDIS_URL` for the tool call and no model credentials. The test covers chat, tool execution, and application-provided session targeting; it does not evaluate model quality or a Vercel deployment.

[Back to the docs home](../README.md)
