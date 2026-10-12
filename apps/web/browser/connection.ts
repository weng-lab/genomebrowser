import {
  browserCommandSchema,
  connectedEventSchema,
  type ConnectedEvent,
} from "@weng-lab/browser-server/protocol";
import type { BrowserSession } from "./BrowserSession";
import { executeBrowserCommand } from "./execute";
import { persistBrowserSession, type SessionSaveState } from "./persistence";

export type CommandConnectionState =
  | { status: "disabled" | "connecting" }
  | { status: "connected"; clientId: string };

/** Owns one live connection. Reconnection gets a new target ID and never replays commands. */
export function connectBrowserCommands(
  endpoint: string,
  session: BrowserSession,
  onState: (state: CommandConnectionState) => void,
  onSaveState: (state: SessionSaveState) => void,
) {
  const base = endpoint.replace(/\/$/, "");
  const abort = new AbortController();
  const persistence = persistBrowserSession(base, session, onSaveState);
  let source: EventSource;
  let retry: ReturnType<typeof setTimeout> | undefined;

  function open() {
    if (abort.signal.aborted) return;
    onState({ status: "connecting" });
    const current = new EventSource(`${base}/events`);
    source = current;
    let connection: ConnectedEvent | undefined;

    function restart() {
      if (abort.signal.aborted || source !== current) return;
      current.close();
      persistence.disconnected();
      connection = undefined;
      onState({ status: "connecting" });
      clearTimeout(retry);
      retry = setTimeout(open, 1000);
    }

    current.addEventListener("connected", (event: MessageEvent<string>) => {
      if (abort.signal.aborted || source !== current) return;
      try {
        const connected = connectedEventSchema.parse(JSON.parse(event.data));
        persistence.connected(connected);
        connection = connected;
        onState({
          status: "connected",
          clientId: connected.clientId,
        });
      } catch {
        onSaveState("load-error");
        restart();
      }
    });

    current.addEventListener("command", (event: MessageEvent<string>) => {
      if (!connection || abort.signal.aborted || source !== current) return;
      try {
        const command = browserCommandSchema.parse(JSON.parse(event.data));
        if (Date.now() >= command.expiresAt) return;
        const result = executeBrowserCommand(session, command);
        // Store mutation success means applied, not that all track data has rendered.
        void fetch(`${base}/clients/${connection.clientId}/results`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ commandId: command.commandId, result }),
          signal: abort.signal,
        }).then((response) => {
          // A command can expire while this tab is suspended. Do not apply it again.
          if (!response.ok && response.status !== 409) restart();
        }, restart);
      } catch {
        restart();
      }
    });

    // Retry even when an HTTP error permanently closes EventSource, such as relay startup.
    current.onerror = restart;
  }

  open();
  return () => {
    persistence.dispose();
    abort.abort();
    clearTimeout(retry);
    source.close();
  };
}
