# Agent commands

`contracts.ts` is a browser-safe module with the contracts for commands agents send to the app. A contract has the MCP tool name, the description agents read, a Zod schema for parameters, and a Zod schema for the successful result. The module also has the wire schemas for a delivered command and the tab's reply. It depends only on Zod and the region schema in `../sessions/snapshot.ts`.

The MCP server in `apps/server` turns each contract into a tool. The web app implements each one in `apps/web/commands/commands.ts`. The server imports these pure contracts directly. Keep them free of Next.js, React, browser stores, and server-only dependencies.

The implemented command is `set_region`. Its region is zero-based and half-open. It returns the region shown and whether the browser clamped it.

## Add a command

1. Add a contract in `contracts.ts` and list it in `commands`:

   ```ts
   export const setRegion = {
     name: "set_region",
     description: "Move the genome browser to a region. ...",
     params: z.strictObject({ region: regionSchema }),
     result: z.strictObject({ region: regionSchema, clamped: z.boolean() }),
   } as const satisfies CommandContract;
   ```

   `as const` keeps the name literal, so the app's handlers are checked against it. Do not add `sessionId` to `params`; the MCP tool adds it. Return what the command did, not the whole session.

2. Add a handler of the same name in `apps/web/commands/commands.ts`. TypeScript reports a missing handler. Call an existing action rather than reimplementing its validation, and return `{ ok: true, value }` or the action's `{ ok: false, code, error }`. Handlers receive `CommandCapabilities`, which today holds the open session's stores. When a command needs something else from the app, add it there and supply it where `RemoteControl.tsx` connects.

3. Add a web test that sends the command to the tab, following `apps/web/test/remoteControl.test.tsx`.

The MCP server picks up the new tool on restart. Its build compiles these contracts and the snapshot schema into its own output. Its Turbo tasks track both files without depending on the web app build.
