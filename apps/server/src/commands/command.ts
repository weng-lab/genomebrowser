import type { BrowserStoreInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import type { z } from "zod";

/** The live stores in the browser tab, the same ones the UI uses. */
export type BrowserStores = {
  useBrowserStore: BrowserStoreInstance;
  useTrackStore: TrackStoreInstance;
};

/** A store action's result. Return it as-is from `run`. */
export type CommandOutcome = { ok: true } | { ok: false; code: string; error: string };

/** Everything needed to expose one browser action to agents. */
export type Command<Params extends z.ZodObject = z.ZodObject> = {
  /** MCP tool name, in snake_case, such as `set_region`. */
  name: string;
  /** Shown to agents. Say what the command does and how to fill in its parameters. */
  description: string;
  /** The command's inputs. The MCP tool adds `sessionId` automatically. */
  params: Params;
  /** Runs in the browser tab. Call an existing store action rather than reimplementing it. */
  run(stores: BrowserStores, params: z.infer<Params>): CommandOutcome;
};

/** Declare a command with its parameter types checked against `run`. */
export function defineCommand<Params extends z.ZodObject>(command: Command<Params>) {
  return command;
}
