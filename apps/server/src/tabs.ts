import type { SSEStreamingApi } from "hono/streaming";
import type { CommandReply, CommandResult } from "@weng-lab/agent-commands";
import { createPendingCommands, type CommandInput } from "./pendingCommands.ts";

type ConnectedTab = {
  pending: ReturnType<typeof createPendingCommands>;
  disconnect: () => void;
};

/** Open browser tabs keyed by session ID. The first tab to connect keeps the session. */
export function createTabConnections(options: {
  commandTimeoutMs?: number;
  heartbeatIntervalMs?: number;
}) {
  const tabs = new Map<string, ConnectedTab>();

  function isConnected(sessionId: string) {
    return tabs.has(sessionId);
  }

  /** Callers must check `isConnected` first; this registers synchronously, so the check cannot race. */
  async function connect(sessionId: string, stream: SSEStreamingApi) {
    let disconnect!: () => void;
    const disconnected = new Promise<void>((resolve) => {
      disconnect = resolve;
    });
    const pending = createPendingCommands({
      timeoutMs: options.commandTimeoutMs ?? 5_000,
      send: (command) => stream.writeSSE({ event: "command", data: JSON.stringify(command) }),
    });

    tabs.set(sessionId, { pending, disconnect });
    stream.onAbort(disconnect);
    const heartbeat = setInterval(
      () => void stream.write(": heartbeat\n\n").catch(disconnect),
      options.heartbeatIntervalMs ?? 15_000,
    );

    try {
      await stream.write(": connected\n\n");
      await disconnected;
    } finally {
      clearInterval(heartbeat);
      tabs.delete(sessionId);
      pending.disconnect();
    }
  }

  async function dispatch(
    sessionId: string,
    command: CommandInput,
    signal: AbortSignal,
  ): Promise<CommandResult> {
    const tab = tabs.get(sessionId);
    if (!tab) {
      return {
        ok: false,
        code: "NOT_CONNECTED",
        error: "The session is not open in a browser tab with remote control enabled",
      };
    }
    return tab.pending.sendAndWait(command, signal);
  }

  function acknowledge(sessionId: string, reply: CommandReply): boolean {
    return tabs.get(sessionId)?.pending.acknowledge(reply) ?? false;
  }

  function close() {
    for (const tab of tabs.values()) tab.disconnect();
  }

  return { isConnected, connect, dispatch, acknowledge, close };
}

export type TabConnections = ReturnType<typeof createTabConnections>;
