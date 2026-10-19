import { commands, type Command, type CommandMessage, type CommandResult } from "./contracts.ts";
import type { GenomeBrowserStores } from "@weng-lab/genomebrowser";
import type { z } from "zod";

/**
 * What commands act on. Today, the open session's stores, the same ones the UI
 * uses. Add other app capabilities here when a command needs them.
 */
export type CommandCapabilities = { stores: GenomeBrowserStores };

type Failure = { ok: false; code: string; error: string };
type Handler<C extends Command> = (
  app: CommandCapabilities,
  params: z.infer<C["params"]>,
) => { ok: true; value: z.infer<C["result"]> } | Failure;

/**
 * How the app carries out each command. Call an existing action rather than
 * reimplementing it, and return its outcome.
 */
const handlers: { [C in Command as C["name"]]: Handler<C> } = {
  set_region({ stores }, { region }) {
    const outcome = stores.useBrowserStore.getState().setRegion(region);
    if (!outcome.ok) return outcome;
    return { ok: true, value: { region: outcome.region, clamped: outcome.clamped } };
  },
};

/** Validate a delivered command's parameters and run it with `app`. */
export function executeCommand(app: CommandCapabilities, message: CommandMessage): CommandResult {
  const command = commands.find(({ name }) => name === message.name);
  if (!command) return { ok: false, code: "UNKNOWN_COMMAND", error: `No command ${message.name}` };
  const params = command.params.safeParse(message.params);
  if (!params.success) {
    return { ok: false, code: "INVALID_PARAMS", error: "Invalid command parameters" };
  }
  // TypeScript cannot relate a looked-up handler to its command's schema.
  const handler = handlers[command.name] as Handler<typeof command>;
  const outcome = handler(app, params.data);
  return outcome.ok ? outcome : { ok: false, code: outcome.code, error: outcome.error };
}
