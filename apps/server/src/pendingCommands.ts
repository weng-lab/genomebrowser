import { randomUUID } from "node:crypto";
import type { CommandMessage, CommandReply, CommandResult } from "../../web/commands/contracts.ts";

export type CommandInput = Pick<CommandMessage, "name" | "params">;

type PendingRequest = {
  resolve: (result: CommandResult) => void;
  timer: ReturnType<typeof setTimeout>;
  removeAbortListener: () => void;
};

function failure(code: string, error: string): CommandResult {
  return { ok: false, code, error };
}

/** One tab's outstanding commands, including every path that ends a request. */
export function createPendingCommands(options: {
  send: (command: CommandMessage) => Promise<void>;
  timeoutMs: number;
}) {
  const pending = new Map<string, PendingRequest>();
  let disconnected = false;

  function finish(commandId: string, result: CommandResult): boolean {
    const request = pending.get(commandId);
    if (!request) return false;

    pending.delete(commandId);
    clearTimeout(request.timer);
    request.removeAbortListener();
    request.resolve(result);
    return true;
  }

  function waitForReply(commandId: string, signal: AbortSignal): Promise<CommandResult> {
    return new Promise((resolve) => {
      const cancel = () => finish(commandId, failure("CANCELLED", "The command was cancelled"));
      const timer = setTimeout(() => {
        finish(commandId, failure("TIMEOUT", "The browser tab did not reply in time"));
      }, options.timeoutMs);

      pending.set(commandId, {
        resolve,
        timer,
        removeAbortListener: () => signal.removeEventListener("abort", cancel),
      });
      signal.addEventListener("abort", cancel, { once: true });
    });
  }

  async function sendAndWait(command: CommandInput, signal: AbortSignal): Promise<CommandResult> {
    if (disconnected) return failure("NOT_CONNECTED", "The browser tab disconnected");
    if (signal.aborted) return failure("CANCELLED", "The command was cancelled");
    if (pending.size >= 32) return failure("BUSY", "Too many pending commands");

    const commandId = randomUUID();
    const expiresAt = Date.now() + options.timeoutMs;
    // Register first so an immediate browser reply cannot be missed.
    const result = waitForReply(commandId, signal);

    // Do not block cancellation or timeout on a stalled stream write.
    try {
      void options.send({ ...command, commandId, expiresAt }).catch(disconnect);
    } catch {
      disconnect();
    }
    return result;
  }

  function acknowledge(reply: CommandReply): boolean {
    return finish(reply.commandId, reply.result);
  }

  function disconnect() {
    disconnected = true;
    for (const commandId of pending.keys()) {
      finish(commandId, failure("NOT_CONNECTED", "The browser tab disconnected"));
    }
  }

  return { sendAndWait, acknowledge, disconnect };
}
