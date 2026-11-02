import type {
  BrowserDownloadOptions,
  BrowserImage,
  GenomeBrowserStores,
} from "@weng-lab/genomebrowser";
import type { z } from "zod";

/**
 * What a command acts on in the browser tab: the open session's stores, the same
 * ones the UI uses, and the app's own actions. Add an action here when a command
 * needs browser work, so command files stay free of browser code and the agent
 * can load them on the server.
 */
export type CommandApp = {
  stores: GenomeBrowserStores;
  /** Export the rendered browser, named after its region unless `filename` is given. */
  exportImage(
    format: BrowserImage["format"],
    options: BrowserDownloadOptions,
    signal: AbortSignal,
  ): Promise<BrowserImage>;
  /** Show an exported image to the user, who decides whether to download it. */
  showImage(image: BrowserImage): void;
};

export type CommandFailure = { ok: false; code: string; error: string };
export type CommandOutcome<Result> = { ok: true; value: Result } | CommandFailure;

/**
 * Everything about one agent command. The agent offers it as a tool named
 * `name`, built from `description`, `params`, and `result`; the browser tab
 * runs `run` against its open session. `run` makes edits synchronously, so they
 * cannot land after `signal` aborts; asynchronous work checks `signal` before
 * any effect the user would see.
 */
export type Command<
  Params extends z.ZodObject = z.ZodObject,
  Result extends z.ZodObject = z.ZodObject,
> = {
  /** Tool name, in snake_case. The agent's tool file has the same name. */
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
