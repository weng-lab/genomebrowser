import { addTracksFromUrls } from "./addTracksFromUrls";
import type { CommandApp } from "./define";
import { exportImage } from "./exportImage";
import type { CommandMessage, CommandResult } from "./protocol";
import { setRegion } from "./setRegion";
import { sortTracks } from "./sortTracks";

/**
 * Every agent command. Define a command once in its own file and list it here:
 * MCP publishes it as a tool, and the browser tab runs the same definition.
 */
export const commands = [setRegion, exportImage, sortTracks, addTracksFromUrls] as const;

export type { Command, CommandApp, CommandOutcome } from "./define";

/**
 * Validate a delivered command's parameters and run it with `app`. Synchronous
 * commands finish before this returns its promise.
 */
export async function runCommand(
  app: CommandApp,
  message: Pick<CommandMessage, "name" | "params">,
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
  ) => CommandResult | Promise<CommandResult>;
  const outcome = await run(app, params.data, signal);
  return outcome.ok ? outcome : { ok: false, code: outcome.code, error: outcome.error };
}
