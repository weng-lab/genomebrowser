import type { BrowserImage, GenomeBrowserStores } from "@weng-lab/genomebrowser";
import type { z } from "zod";
import type { UrlTrackInput, UrlTracksOutcome } from "../../browser/urlTracks";

export type CommandFailure = { ok: false; code: string; error: string };
export type CommandOutcome<Value> = { ok: true; value: Value } | CommandFailure;

/**
 * What a command acts on in the browser tab: the open session's stores, the same
 * ones the UI uses, and app actions that need browser code. Command files import
 * only schemas and types, so the MCP endpoint can load them on the server. Add an
 * action here when a command needs browser work.
 */
export type CommandApp = {
  stores: GenomeBrowserStores;
  /** Sort the loaded tracks once by field IDs in priority order, as the Sort tracks dialog does. */
  sortTracks(fieldIds: readonly string[]): { ok: true } | CommandFailure;
  /** Export the rendered browser, named after its region unless `filename` is given. */
  exportImage(
    format: BrowserImage["format"],
    options: { scale: number; includeTitles: boolean; includeRuler: boolean; filename?: string },
    signal: AbortSignal,
  ): Promise<BrowserImage>;
  /** Show an exported image to the user, who decides whether to download it. */
  showImage(image: BrowserImage): void;
  /** Check that the browser can read each file URL as a track, then add every track below the others, or none. */
  addTracksFromUrls(
    inputs: readonly UrlTrackInput[],
    signal: AbortSignal,
  ): Promise<UrlTracksOutcome>;
};

/**
 * Everything about one agent command. MCP publishes it as a tool named `name`,
 * built from `description`, `params`, and `result`; the browser tab runs `run`
 * against its open session. `run` makes edits synchronously, so they cannot land
 * after `signal` aborts; asynchronous work checks `signal` before any effect the
 * user would see.
 */
export type Command<
  Params extends z.ZodObject = z.ZodObject,
  Result extends z.ZodObject = z.ZodObject,
> = {
  /** Tool name, in snake_case. */
  name: string;
  /** Shown to agents. Say what the command does and how to fill in its parameters. */
  description: string;
  params: Params;
  result: Result;
  run(
    app: CommandApp,
    params: z.output<Params>,
    signal: AbortSignal,
  ): CommandOutcome<z.input<Result>> | Promise<CommandOutcome<z.input<Result>>>;
};

export function defineCommand<Params extends z.ZodObject, Result extends z.ZodObject>(
  command: Command<Params, Result>,
) {
  return command;
}
