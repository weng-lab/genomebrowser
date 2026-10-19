# App contracts

`@weng-lab/contracts` is a private, browser-safe workspace package with the contracts for commands agents send to the app. A contract has the MCP tool name, the description agents read, a Zod schema for parameters, and a Zod schema for the successful result. The module also has the wire schemas for a delivered command and the tab's reply. It owns the shared `regionSchema` and depends only on Zod. The web app composes that schema into its own session snapshot schema.

The MCP server in `apps/server` turns each contract into a tool. The web app implements each one in `apps/web/features/agent/commands.ts`. Both apps import these contracts from `@weng-lab/contracts`. Keep them free of Next.js, React, browser stores, and server-only dependencies.

The implemented command is `set_region`. Its region is zero-based and half-open. It returns the region shown and whether the browser clamped it.

Build with `pnpm exec turbo run build --filter=@weng-lab/contracts`. The package exports compiled ESM and TypeScript declarations from `dist/`. Keep runtime handlers, user models, and persistence schemas with their app owners.

## Add a command

1. Add a contract in `src/index.ts` and list it in `commands`:

   ```ts
   export const setRegion = {
     name: "set_region",
     description: "Move the genome browser to a region. ...",
     params: z.strictObject({ region: regionSchema }),
     result: z.strictObject({ region: regionSchema, clamped: z.boolean() }),
   } as const satisfies CommandContract;
   ```

   `as const` keeps the name literal, so the app's handlers are checked against it. Do not add `sessionId` to `params`; the MCP tool adds it. Return what the command did, not the whole session.

2. Add a handler of the same name in `apps/web/features/agent/commands.ts`. TypeScript reports a missing handler. Call an existing action rather than reimplementing its validation, and return `{ ok: true, value }` or the action's `{ ok: false, code, error }`. Handlers receive `CommandCapabilities`, which today holds the open session's stores. When a command needs something else from the app, add it there and supply it where `RemoteControl.tsx` connects.

3. Add a web test that sends the command to the tab, following `apps/web/test/remoteControl.test.tsx`.

Rebuild contracts and restart the dev processes after changing a contract; the current dev command builds dependencies once rather than watching their source. The MCP server registers tools from the compiled definitions. Turbo builds this package before either app and tracks it as a workspace dependency. The MCP server does not depend on the web app build.
