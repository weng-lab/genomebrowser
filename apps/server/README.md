# Browser server

`@weng-lab/browser-server` is a private persistent Node.js relay. It sends commands to connected browser tabs and waits for their replies. Browser and track state remain in Workspace.

Use Node.js 24 or newer. From the repository root, set `GB_API_TOKEN` and run `pnpm dev:server`, or run `pnpm dev` to start web and server together. See the [web app guide](../web/README.md) for complete setup, curl examples, command extension, and deployment instructions.

| Environment variable | Default                                       | Purpose                                                |
| -------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `GB_API_TOKEN`       | Required                                      | Bearer token for client discovery and region commands. |
| `GB_SERVER_HOST`     | `127.0.0.1`                                   | Listen address.                                        |
| `GB_SERVER_PORT`     | `3001`                                        | Listen port.                                           |
| `GB_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated browser origins.                       |

The relay rejects requests carrying an Origin outside the configured list. Authentication remains required for administrative requests, including requests without an Origin header. Browser stream replies use a separate connection-scoped token.

`src/main.ts` configures and starts the native Node.js server. `src/server.ts` owns active connections and pending commands. `@weng-lab/browser-server/protocol` exports browser-safe Zod schemas and inferred types directly from source; frontend consumers must never import the Node.js server implementation.

Build with `pnpm exec turbo run build --filter=@weng-lab/browser-server`, then run `pnpm --filter @weng-lab/browser-server start`. Host one persistent relay instance. The current protocol has no replay, persisted state, or tenant authentication.
