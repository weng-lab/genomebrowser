import "server-only";
import type { SessionService } from "../../sessions/server/service";
import type { SessionSnapshot } from "../../sessions/snapshot.ts";
import { commands, type Command, type StateCommand, type StateCommandOutcome } from "../commands";
import type { CommandResult } from "../commands/protocol";

/**
 * Execute a state agent command directly against `SessionService` using the
 * command's single shared `run` definition. Read commands read via `load`;
 * write commands persist to PostgreSQL via `mutate` and broadcast through `SessionBus`.
 */
export async function runServerStateCommand(
  service: SessionService,
  sessionId: string,
  commandOrName: StateCommand | string,
  rawParams: unknown,
): Promise<CommandResult> {
  const command =
    typeof commandOrName === "string"
      ? (commands as readonly Command[]).find(
          (candidate): candidate is StateCommand =>
            candidate.name === commandOrName && candidate.target === "state",
        )
      : commandOrName;
  if (!command) {
    const label = typeof commandOrName === "string" ? commandOrName : "unknown";
    return { ok: false, code: "UNKNOWN_COMMAND", error: `No state command ${label}` };
  }
  const parsed = command.params.safeParse(rawParams);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_PARAMS", error: "Invalid command parameters" };
  }

  const execute = command.run as (
    snapshot: SessionSnapshot,
    params: unknown,
  ) => StateCommandOutcome<unknown>;

  if (command.access === "read") {
    const saved = await service.load(sessionId);
    const outcome = execute(saved.snapshot, parsed.data);
    return outcome.ok ? ({ ok: true, value: outcome.value } as CommandResult) : outcome;
  }

  const outcome = await service.mutate(sessionId, (current) => {
    const result = execute(current.snapshot, parsed.data);
    if (!result.ok) return result;
    return {
      ok: true,
      name: current.name,
      snapshot: result.snapshot ?? current.snapshot,
      value: result.value,
    };
  });
  return outcome.ok ? ({ ok: true, value: outcome.value } as CommandResult) : outcome;
}
