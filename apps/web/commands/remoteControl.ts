import { commandMessageSchema, type CommandResult } from "@weng-lab/agent-commands";
import { executeCommand, type CommandCapabilities } from "./commands";

export type RemoteControlState = "off" | "connecting" | "connected";

/**
 * Accept agent commands for one session from the MCP server until `signal`
 * aborts, then disconnect. Only the first tab to connect receives them; other
 * tabs keep retrying until it closes. Commands are never replayed, and a command
 * that arrives once `signal` has aborted fails without running.
 */
export function connectRemoteControl(
  rpcUrl: string,
  app: CommandCapabilities,
  signal: AbortSignal,
  onState: (state: RemoteControlState) => void,
) {
  const abort = new AbortController();
  const stopped = AbortSignal.any([abort.signal, signal]);
  let source: EventSource | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;

  function open() {
    if (stopped.aborted) return;
    onState("connecting");
    const current = new EventSource(rpcUrl);
    source = current;

    function restart() {
      if (stopped.aborted || source !== current) return;
      current.close();
      onState("connecting");
      clearTimeout(retry);
      retry = setTimeout(open, 1000);
    }

    current.onopen = () => {
      if (!stopped.aborted && source === current) onState("connected");
    };

    current.addEventListener("command", (event: MessageEvent<string>) => {
      if (abort.signal.aborted || source !== current) return;
      try {
        const command = commandMessageSchema.parse(JSON.parse(event.data));
        if (Date.now() >= command.expiresAt) return;
        // Its edits would no longer be saved, so the command must not report success.
        const result: CommandResult = signal.aborted
          ? { ok: false, code: "SESSION_CLOSED", error: "The session is no longer open" }
          : executeCommand(app, command);
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

  function stop() {
    clearTimeout(retry);
    source?.close();
    onState("off");
  }

  stopped.addEventListener("abort", stop, { once: true });
  open();
  if (stopped.aborted) stop();
  return () => abort.abort();
}
