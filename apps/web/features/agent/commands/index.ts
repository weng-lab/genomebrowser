import type { CommandApp } from "./define";
import { exportImage } from "./exportImage";
import type { CommandMessage, CommandResult } from "./protocol";
import { setRegion } from "./setRegion";

/**
 * Every agent command. Each one becomes an agent tool, through a one-line file
 * in `agent/tools/` named after it, and runs in the browser tab. To add one,
 * define it with `defineCommand`, list it here, and add its tool file.
 */
export const commands = [setRegion, exportImage] as const;

export type { Command, CommandApp, CommandOutcome } from "./define";
export type { CommandMessage, CommandReply, CommandResult } from "./protocol";

/**
 * Validate a delivered command's parameters and run it with `app`. Synchronous
 * commands finish before this returns its promise.
 */
export async function runCommand(
  app: CommandApp,
  message: CommandMessage,
  signal: AbortSignal,
): Promise<CommandResult> {
  const command = commands.find(({ name }) => name === message.name);
  if (!command) return { ok: false, code: "UNKNOWN_COMMAND", error: `No command ${message.name}` };
  const params = command.params.safeParse(message.params);
  if (!params.success) {
    return { ok: false, code: "INVALID_PARAMS", error: "Invalid command parameters" };
  }
  // TypeScript cannot relate a looked-up command to its own parameter schema.
  const run = command.run as (
    app: CommandApp,
    params: unknown,
    signal: AbortSignal,
  ) => ReturnType<(typeof commands)[number]["run"]>;
  const outcome = await run(app, params.data, signal);
  return outcome.ok ? outcome : { ok: false, code: outcome.code, error: outcome.error };
}
