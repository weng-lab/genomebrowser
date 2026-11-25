import { addTracksFromUrls } from "./addTracksFromUrls";
import { releaseControl, takeControl } from "./control";
import type { BrowserCommand, Command, CommandApp } from "./define";
import { exportImage } from "./exportImage";
import { listTracks } from "./listTracks";
import type { CommandAgent, CommandMessage, CommandResult } from "./protocol";
import { setRegion } from "./setRegion";
import { setTrackMetadata } from "./setTrackMetadata";
import { sortTracks } from "./sortTracks";

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
  takeControl,
  releaseControl,
] as const;

export type {
  BrowserCommand,
  Command,
  CommandApp,
  CommandOutcome,
  StateCommand,
  StateCommandOutcome,
} from "./define";

/**
 * The tab's `CommandApp`, whose control knows which agent holds it, so one agent
 * cannot give back control another holds.
 */
export type TabApp = Omit<CommandApp, "control"> & {
  control: { take(agent: CommandAgent): void; release(agent: CommandAgent): void };
};

/**
 * Validate a delivered browser command's parameters and run it with `app`, as
 * the message's agent. State commands run exclusively on the server and are
 * rejected here.
 */
export async function runCommand(
  { control, ...rest }: TabApp,
  message: Pick<CommandMessage, "name" | "params" | "agent">,
  signal: AbortSignal,
): Promise<CommandResult> {
  const agent = message.agent ?? "external";
  const app: CommandApp = {
    ...rest,
    control: { take: () => control.take(agent), release: () => control.release(agent) },
  };
  const command = (commands as readonly Command[]).find(
    (candidate): candidate is BrowserCommand =>
      candidate.name === message.name && candidate.target === "browser",
  );
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
