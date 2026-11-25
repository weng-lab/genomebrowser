import { addTracksFromUrls } from "./addTracksFromUrls";
import type { CommandApp, StateCommandHelpers, StateCommandOutcome } from "./define";
import { exportImage } from "./exportImage";
import { listTracks } from "./listTracks";
import type { CommandMessage, CommandResult } from "./protocol";
import { setRegion } from "./setRegion";
import { setTrackMetadata } from "./setTrackMetadata";
import { sortTracks } from "./sortTracks";
import type { SessionSnapshot } from "../../sessions/snapshot.ts";

/**
 * Every agent command. Define a command once in its own file and list it here:
 * MCP publishes it as a tool; state commands run on `SessionService` on the
 * server, and browser commands relay to the open browser tab.
 */
export const commands = [
  setRegion,
  exportImage,
  sortTracks,
  addTracksFromUrls,
  listTracks,
  setTrackMetadata,
] as const;

export type {
  BrowserCommand,
  Command,
  CommandApp,
  CommandOutcome,
  StateCommand,
  StateCommandHelpers,
  StateCommandOutcome,
} from "./define";

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
  if (command.target === "state") {
    const run = command.run as (
      snapshot: SessionSnapshot,
      params: unknown,
      helpers: StateCommandHelpers,
    ) => StateCommandOutcome<unknown>;
    const outcome = run(app.snapshot(), params.data, app.stateHelpers);
    if (!outcome.ok) return { ok: false, code: outcome.code, error: outcome.error };
    if (outcome.snapshot) app.applySnapshot(outcome.snapshot);
    return {
      ok: true,
      value: outcome.value as CommandResult & { ok: true } extends { value: infer V } ? V : never,
    };
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
