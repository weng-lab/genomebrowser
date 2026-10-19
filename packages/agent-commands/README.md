# Agent commands

`@weng-lab/agent-commands` is a private, browser-safe package with the contracts for commands agents send to the app. A contract has the MCP tool name, the description agents read, a Zod schema for parameters, and a Zod schema for the successful result. The package also has the wire schemas for a delivered command and the tab's reply. It depends only on Zod and `@weng-lab/session-snapshot`, whose region schema it reuses.

The MCP server in `apps/server` turns each contract into a tool. The web app implements each one in `apps/web/commands/commands.ts`. Neither imports the other.

The implemented command is `set_region`. Its region is zero-based and half-open. It returns the region shown and whether the browser clamped it.

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

2. Add a handler of the same name in `apps/web/commands/commands.ts`. TypeScript reports a missing handler. Call an existing action rather than reimplementing its validation, and return `{ ok: true, value }` or the action's `{ ok: false, code, error }`. Handlers receive `CommandCapabilities`, which today holds the open session's stores. When a command needs something else from the app, add it there and supply it where `RemoteControl.tsx` connects.

3. Add a web test that sends the command to the tab, following `apps/web/test/remoteControl.test.tsx`.

The MCP server picks up the new tool on restart. Build this package with `pnpm exec turbo run build --filter=@weng-lab/agent-commands`; Turbo builds it before its consumers.
