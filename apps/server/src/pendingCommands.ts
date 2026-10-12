import { randomUUID } from "node:crypto";
import type { BrowserCommand, CommandReply } from "./protocol.ts";

export type CommandInput = Omit<BrowserCommand, "commandId" | "expiresAt">;

type PendingRequest = {
  resolve: (response: Response) => void;
  timer: ReturnType<typeof setTimeout>;
  removeAbortListener: () => void;
};

/** One browser's outstanding commands, including every path that ends a request. */
export function createPendingCommands(options: {
  send: (command: BrowserCommand) => Promise<void>;
  timeoutMs: number;
}) {
  const pending = new Map<string, PendingRequest>();
  let disconnected = false;

  function finish(commandId: string, response: Response): boolean {
    const request = pending.get(commandId);
    if (!request) return false;

    pending.delete(commandId);
    clearTimeout(request.timer);
    request.removeAbortListener();
    request.resolve(response);
    return true;
  }

  function waitForReply(commandId: string, signal: AbortSignal): Promise<Response> {
    return new Promise((resolve) => {
      const cancel = () => finish(commandId, new Response(null, { status: 499 }));
      const timer = setTimeout(() => {
        finish(
          commandId,
          Response.json({ commandId, error: "Browser command timed out" }, { status: 504 }),
        );
      }, options.timeoutMs);

      pending.set(commandId, {
        resolve,
        timer,
        removeAbortListener: () => signal.removeEventListener("abort", cancel),
      });
      signal.addEventListener("abort", cancel, { once: true });
    });
  }

  async function sendAndWait(command: CommandInput, signal: AbortSignal): Promise<Response> {
    if (disconnected) {
      return Response.json({ error: "Browser disconnected" }, { status: 409 });
    }
    if (signal.aborted) {
      return new Response(null, { status: 499 });
    }
    if (pending.size >= 32) {
      return Response.json({ error: "Too many pending commands" }, { status: 429 });
    }

    const commandId = randomUUID();
    const expiresAt = Date.now() + options.timeoutMs;
    // Register first so an immediate browser reply cannot be missed.
    const response = waitForReply(commandId, signal);

    // Do not block cancellation or timeout on a stalled stream write.
    try {
      void options.send({ ...command, commandId, expiresAt }).catch(disconnect);
    } catch {
      disconnect();
    }
    return response;
  }

  function acknowledge(reply: CommandReply): boolean {
    return finish(reply.commandId, Response.json(reply, { status: reply.result.ok ? 200 : 422 }));
  }

  function disconnect() {
    disconnected = true;
    for (const commandId of pending.keys()) {
      finish(commandId, Response.json({ error: "Browser disconnected" }, { status: 409 }));
    }
  }

  return { sendAndWait, acknowledge, disconnect };
}
