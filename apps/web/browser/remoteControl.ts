import { commandMessageSchema } from "@weng-lab/browser-server/protocol";
import type { BrowserSession } from "./BrowserSession";
import { executeBrowserCommand } from "./execute";

export type RemoteControlState = "off" | "connecting" | "connected";

/**
 * Accept commands for one session from the server. Only the first tab to connect receives
 * them; other tabs keep retrying until it closes. Commands are never replayed.
 */
export function connectRemoteControl(
  rpcUrl: string,
  session: BrowserSession,
  onState: (state: RemoteControlState) => void,
) {
  const abort = new AbortController();
  let source: EventSource;
  let retry: ReturnType<typeof setTimeout> | undefined;

  function open() {
    if (abort.signal.aborted) return;
    onState("connecting");
    const current = new EventSource(rpcUrl);
    source = current;

    function restart() {
      if (abort.signal.aborted || source !== current) return;
      current.close();
      onState("connecting");
      clearTimeout(retry);
      retry = setTimeout(open, 1000);
    }

    current.onopen = () => {
      if (!abort.signal.aborted && source === current) onState("connected");
    };

    current.addEventListener("command", (event: MessageEvent<string>) => {
      if (abort.signal.aborted || source !== current) return;
      try {
        const command = commandMessageSchema.parse(JSON.parse(event.data));
        if (Date.now() >= command.expiresAt) return;
        const result = executeBrowserCommand(session, command);
        void fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

    // EventSource closes on HTTP errors, including the 409 for a session open in another tab.
    current.onerror = restart;
  }

  open();
  return () => {
    abort.abort();
    clearTimeout(retry);
    source.close();
    onState("off");
  };
}
