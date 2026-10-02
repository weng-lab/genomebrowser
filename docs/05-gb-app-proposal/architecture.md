# Architecture

Build one workspace UI and one shared API server. The local and cloud entry points supply the parts that differ. Keep genome browsing behavior in the existing `@weng-lab/genomebrowser` library.

## Responsibilities

The folder layout below carries forward the earlier design. These are planned responsibilities, not a claim that each app already exists.

| Location | Owns |
| --- | --- |
| `packages/` | Genome browser stores, rendering, tracks, readers, and reusable controls. |
| `apps/workspace` | Shared layout, header, session picker, genome browser, chat panel, and settings. Also handles browser commands received from the server. |
| `apps/server` | Shared session API, MCP tools, access checks, and delivery of commands to browser tabs. |
| `apps/local` | CLI startup, local persistence, file serving, ACP agent connections, and the local page. |
| `apps/cloud` | Website, Clerk integration, cloud persistence, Eve, and deployment of the API server. |

The server owns persistence. The workspace calls its API. Supply local and cloud storage implementations to shared server code rather than duplicating session and tool logic.

Dependency injection is a simple way to supply these differences: pass the implementation into shared code when the app starts. Storage, authentication, and chat providers can each follow this pattern where needed. Plain function arguments and React props are enough; no dependency-injection framework is needed.

For example, both storage implementations could satisfy the same small interface. This is an illustrative sketch, not the final storage API:

```ts
interface SessionStorage {
  load(id: string): Promise<string | null>;
  save(id: string, snapshot: string): Promise<void>;
}

// Shared server code receives storage instead of choosing a database.
function createServer({ sessions }: { sessions: SessionStorage }) {
  // Session routes use sessions.load() and sessions.save().
}

// Local entry point
createServer({ sessions: sqliteStorage });

// Cloud entry point
createServer({ sessions: postgresStorage });
```

The entry points create `sqliteStorage` and `postgresStorage`. Shared session logic only knows the interface, so it does not need local/cloud conditionals or database-specific imports.

The earlier design proposes SQLite locally, Postgres in cloud, Vite for the local page, Next.js and Eve on Vercel, and a separate API server on Cloud Run. Treat that stack as the starting proposal and validate it in the early deployment before spending time on production scaling.

## Two builds, one interface

Both entry points render the same workspace components. Keep their job small: supply the API connection, chat provider, and navigation. A change to the session picker or chat layout should only need one implementation.

A `cloudSignInEnabled` prop controls cloud account features. Initially it is enabled on the website and disabled locally. When disabled, hide cloud account controls and do not make cloud sign-in requests. Local server authentication still applies.

Keep Next.js dependencies in the cloud entry point. Share styling and layout through the workspace. The website may have landing and account pages around it, but the browser experience should remain nearly identical.

## Browser state and commands

The browser tab owns the live Zustand stores. UI controls and agent commands call the library's exposed store actions. Most browser behavior already belongs in those actions; the app should not reimplement it.

MCP is the protocol that gives agents access to browser state and controls. Expose a useful subset of the store operations with tool descriptions and input schemas. Do not turn every store function into a tool automatically.

A tool call follows this path:

1. The agent calls the API server's MCP endpoint.
2. The server checks access to the target session and delivers the command to its open browser tab.
3. The tab calls the store action and returns the result to the agent through the server.

The existing SSE and HTTP POST design can carry commands and results. SSE is an HTTP connection the server keeps open to send events to the tab. If the tab is unavailable, return a clear error. Running browser commands without an open tab is outside the initial scope.

Allow ordinary browser changes without per-action approval, including track removal. Keep account administration, access changes, and deletion of saved sessions outside these tools. Session ownership and connection authentication still apply. This policy covers browser tools; an ACP agent's own shell and file tools have their own permission behavior.

## Chat and agents

The chat panel is an interface to an agent. It does not define the browser tools.

- Cloud chat connects to Eve.
- Local chat connects to an agent through ACP, the Agent Client Protocol.
- External agents can use the browser's MCP tools without using the chat panel.

Eve and ACP agents use the same MCP tools to operate the browser. Translate their conversation events into a shared chat format so the panel does not depend on either provider's protocol.

Clerk handles cloud sign-in. Guests can browse without an account and receive a small Eve allowance. The server must enforce the allowance; the exact limits and anonymous-user accounting are still open.

## Saved sessions

Save the serializable browser store state, track store state, and basic session metadata. Restore that data when a user reopens a session. The exact format and collection persistence can be decided during implementation.

A local session lives in local storage; a cloud session lives in cloud storage. Use globally unique session IDs and keep persistence behind the shared server's storage interface. Do not implement cross-environment access or offline cloud syncing yet.

Two web browser tabs can otherwise overwrite the same saved session with different state. Live synchronization is out of scope. A save-version check is a proposed safeguard, with its timing and conflict behavior still to be decided.

## Local files

The local server serves files from folders the user chooses to expose. The browser reads those files over HTTP, including byte-range requests for formats such as BigWig and BigBed. Files stay on the machine running `gb`; there is no automatic upload.

Support project-folder use and a way to remember exposed locations across launches. A config file under `~/.gb/` is a proposal. The folder defaults, CLI flags, and picker layout are still open.

Running on a lab server uses this same design. SSH forwards the server's port to the user's laptop. Keep the local service private and authenticate its requests, including file requests. Folder exposure controls what the file server can read; it does not sandbox an agent's own shell tools.

[Back to release scope](README.md)
