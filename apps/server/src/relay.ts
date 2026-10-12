import { randomUUID } from "node:crypto";
import type { SSEStreamingApi } from "hono/streaming";
import type { CommandReply, SessionSnapshot } from "./protocol.ts";
import { createPendingCommands, type CommandInput } from "./pendingCommands.ts";

type ConnectedBrowser = {
  pending: ReturnType<typeof createPendingCommands>;
  disconnect: () => void;
};

/** Owns browser connections; each connection owns its pending command tracker. */
export function createBrowserRelay(options: {
  commandTimeoutMs?: number;
  heartbeatIntervalMs?: number;
}) {
  const browsers = new Map<string, ConnectedBrowser>();

  function listBrowsers() {
    return [...browsers.keys()].map((clientId) => ({ clientId }));
  }

  function hasBrowser(clientId: string) {
    return browsers.has(clientId);
  }

  async function connectBrowser(stream: SSEStreamingApi, snapshot: SessionSnapshot | null) {
    const clientId = randomUUID();
    let disconnect!: () => void;
    const disconnected = new Promise<void>((resolve) => {
      disconnect = resolve;
    });
    const pending = createPendingCommands({
      timeoutMs: options.commandTimeoutMs ?? 5_000,
      send: (command) => stream.writeSSE({ event: "command", data: JSON.stringify(command) }),
    });

    browsers.set(clientId, { pending, disconnect });
    stream.onAbort(disconnect);
    const heartbeat = setInterval(
      () => void stream.write(": heartbeat\n\n").catch(disconnect),
      options.heartbeatIntervalMs ?? 15_000,
    );

    try {
      await stream.writeSSE({
        event: "connected",
        data: JSON.stringify({ clientId, snapshot }),
      });
      await disconnected;
    } finally {
      clearInterval(heartbeat);
      browsers.delete(clientId);
      pending.disconnect();
    }
  }

  async function dispatchCommand(
    clientId: string,
    command: CommandInput,
    signal: AbortSignal,
  ): Promise<Response> {
    const browser = browsers.get(clientId);
    if (!browser) {
      return Response.json({ error: "Browser disconnected" }, { status: 409 });
    }
    return browser.pending.sendAndWait(command, signal);
  }

  function acknowledgeCommand(clientId: string, reply: CommandReply): boolean {
    const browser = browsers.get(clientId);
    if (!browser) return false;

    return browser.pending.acknowledge(reply);
  }

  function close() {
    for (const browser of browsers.values()) {
      browser.disconnect();
    }
  }

  return { connectBrowser, dispatchCommand, acknowledgeCommand, listBrowsers, hasBrowser, close };
}

export type BrowserRelay = ReturnType<typeof createBrowserRelay>;
