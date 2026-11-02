import { defineTool } from "eve/tools";
import { sessionIdSchema } from "../../../sessions/schema";
import type { Command } from "../define";
import { getCommandRelay } from "./relay";

/**
 * The agent tool for `command`: it runs the command in the browser tab of the
 * session the conversation belongs to and returns the tab's result. The model
 * cannot choose another session. Failures reach the model as `CODE: message`.
 */
export function commandTool<C extends Command>(command: C) {
  return defineTool({
    description: command.description,
    inputSchema: command.params,
    outputSchema: command.result,
    async execute(params, ctx) {
      const sessionId = sessionIdSchema.parse(
        ctx.session.auth.initiator?.attributes.browserSessionId,
      );
      const result = await getCommandRelay().dispatch(
        sessionId,
        { name: command.name, params },
        ctx.abortSignal,
      );
      if (!result.ok) throw new Error(`${result.code}: ${result.error}`);
      const value = command.result.safeParse(result.value);
      if (!value.success)
        throw new Error("INVALID_REPLY: The browser tab returned an invalid result");
      return value.data;
    },
  });
}
