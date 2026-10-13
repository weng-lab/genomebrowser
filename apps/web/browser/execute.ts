import { commands } from "@weng-lab/browser-server/commands";
import type { CommandMessage, CommandResult } from "@weng-lab/browser-server/protocol";
import type { BrowserSession } from "./BrowserSession";
import { snapshot } from "./snapshot";

/** Run a command from the registry against the tab's stores, then report the whole state. */
export function executeBrowserCommand(
  session: BrowserSession,
  message: CommandMessage,
): CommandResult {
  const command = commands.find(({ name }) => name === message.name);
  if (!command) return { ok: false, code: "UNKNOWN_COMMAND", error: `No command ${message.name}` };
  const params = command.params.safeParse(message.params);
  if (!params.success) {
    return { ok: false, code: "INVALID_PARAMS", error: "Invalid command parameters" };
  }
  const outcome = command.run(session, params.data);
  if (!outcome.ok) return { ok: false, code: outcome.code, error: outcome.error };
  return { ok: true, state: snapshot(session) };
}
