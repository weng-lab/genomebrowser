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
  /**
   * Save the open session's edits, resolving the failure when they cannot be
   * saved. It may wait as long as the server is unreachable.
   */
  save(): Promise<{ message: string } | undefined>;
};

/** `pending`'s value, or `"aborted"` once `signal` aborts first. */
function unlessAborted<A>(pending: Promise<A>, signal: AbortSignal): Promise<A | "aborted"> {
  if (signal.aborted) return Promise.resolve("aborted");
  return new Promise((resolve, reject) => {
    const abort = () => resolve("aborted");
    signal.addEventListener("abort", abort, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

/**
 * Validate a delivered browser command's parameters and run it with `app`, as
 * the message's agent. A command that changes the session succeeds only once
 * the session has saved its change. State commands run exclusively on the
 * server and are rejected here.
 */
export async function runCommand(
  { control, save, ...rest }: TabApp,
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
  if (!outcome.ok) return { ok: false, code: outcome.code, error: outcome.error };
  if (!command.changesSession) return outcome;
  // State commands read the saved session, so the change must be saved before the agent's next one.
  const failure = await unlessAborted(save(), signal);
  if (failure === "aborted") {
    return {
      ok: false,
      code: "CANCELLED",
      error: "The command stopped before the session saved its change",
    };
  }
  if (failure) {
    return {
      ok: false,
      code: "NOT_SAVED",
      error: `The browser made the change, but the session could not save it: ${failure.message}`,
    };
  }
  return outcome;
}
