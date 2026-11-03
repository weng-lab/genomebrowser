import { Deferred, Effect, Exit, Scope } from "effect";
import { runCommand, type CommandApp, type CommandResult } from "./commands";
import { commandCancelSchema, commandMessageSchema } from "./commands/protocol";

export type RemoteControlState = "off" | "connecting" | "connected";

/**
 * Accept agent commands for one session from `rpcUrl` until `signal` aborts,
 * then disconnect. Only the first tab to connect receives them; other tabs keep
 * retrying until it closes. Commands are never replayed, and a command
 * that arrives once `signal` has aborted fails without running. A command still
 * running when the session closes, the tab detaches, the command expires, or
 * the agent cancels it is cancelled.
 */
export function connectRemoteControl(
  rpcUrl: string,
  app: CommandApp,
  signal: AbortSignal,
  onState: (state: RemoteControlState) => void,
) {
  const lifetime = Scope.makeUnsafe();
  const detached = new AbortController();
  let attached = true;
  // Commands still running, by ID. They outlive the connection that delivered them.
  const running = new Map<string, AbortController>();

  // The server stops waiting at `expiresAt`, so later effects would contradict its reply.
  const commandSignal = (expiresAt: number, cancelled: AbortSignal) =>
    AbortSignal.any([
      signal,
      detached.signal,
      cancelled,
      AbortSignal.timeout(Math.max(0, expiresAt - Date.now())),
    ]);

  const stopped = Effect.callback<void>((resume) => {
    const stop = () => resume(Effect.void);
    if (signal.aborted) stop();
    else signal.addEventListener("abort", stop, { once: true });
    return Effect.sync(() => signal.removeEventListener("abort", stop));
  });

  const connection = Effect.scoped(
    Effect.gen(function* () {
      const scope = yield* Effect.scope;
      const reconnect = yield* Deferred.make<void>();
      const restart = () => Deferred.doneUnsafe(reconnect, Effect.void);
      let receiving = true;
      const source = yield* Effect.acquireRelease(
        Effect.sync(() => {
          onState("connecting");
          return new EventSource(rpcUrl);
        }),
        (source) =>
          Effect.sync(() => {
            receiving = false;
            source.close();
          }),
      );

      function reply(commandId: string, result: CommandResult, closed: boolean) {
        const send = Effect.tryPromise((signal) =>
          fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commandId, result }),
            signal,
          }),
        ).pipe(
          Effect.match({
            onFailure: () => {
              if (!closed) restart();
            },
            onSuccess: (response) => {
              // A failed reply only reconnects; executing a command again could duplicate edits.
              if (!closed && !response.ok && response.status !== 409) restart();
            },
          }),
        );
        // Session abort closes the connection and its normal replies immediately.
        // Until React detaches, late events still receive SESSION_CLOSED, in the
        // attachment scope, without applying edits or reopening the connection.
        Effect.runSync(Effect.forkIn(send, closed ? lifetime : scope));
      }

      source.onopen = () => {
        if (attached && receiving && !signal.aborted) onState("connected");
      };
      source.addEventListener("command", (event: MessageEvent<string>) => {
        if (!attached || (!receiving && !signal.aborted)) return;
        try {
          const command = commandMessageSchema.parse(JSON.parse(event.data));
          if (Date.now() >= command.expiresAt) return;
          // This check, and any edit, must run synchronously, before React's effect cleanup.
          if (signal.aborted) {
            const error = "The session is no longer open";
            reply(command.commandId, { ok: false, code: "SESSION_CLOSED", error }, true);
            return;
          }
          const cancel = new AbortController();
          running.set(command.commandId, cancel);
          // The connection may have closed while the command ran.
          const finish = (result: CommandResult) => {
            running.delete(command.commandId);
            if (attached) reply(command.commandId, result, signal.aborted || !receiving);
          };
          runCommand(app, command, commandSignal(command.expiresAt, cancel.signal)).then(
            finish,
            () =>
              finish({
                ok: false,
                code: "COMMAND_FAILED",
                error: "The command failed in the browser tab",
              }),
          );
        } catch {
          if (receiving && !signal.aborted) restart();
        }
      });
      source.addEventListener("cancel", (event: MessageEvent<string>) => {
        try {
          const { commandId } = commandCancelSchema.parse(JSON.parse(event.data));
          running.get(commandId)?.abort();
        } catch {
          if (receiving && !signal.aborted) restart();
        }
      });
      // HTTP errors include the 409 for a session open in another tab.
      source.onerror = restart;
      yield* Deferred.await(reconnect);
    }),
  );
  const reconnecting = Effect.forever(
    Effect.gen(function* () {
      yield* connection;
      onState("connecting");
      yield* Effect.sleep("1 second");
    }),
  );
  Effect.runSync(
    Effect.forkIn(
      Effect.raceFirst(stopped, reconnecting).pipe(
        Effect.ensuring(Effect.sync(() => onState("off"))),
      ),
      lifetime,
    ),
  );

  return () => {
    attached = false;
    detached.abort();
    Effect.runFork(Scope.close(lifetime, Exit.void));
  };
}
