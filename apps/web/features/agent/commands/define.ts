import type { BrowserImage, GenomeBrowserStores } from "@weng-lab/genomebrowser";
import type { z } from "zod";
import type { TrackRequest, UrlTracksOutcome } from "../../browser/urlTracks";
import type { SessionSnapshot } from "../../sessions/snapshot.ts";

export type CommandFailure = { ok: false; code: string; error: string };
export type CommandOutcome<Value> = { ok: true; value: Value } | CommandFailure;
export type StateCommandOutcome<Value> =
  | { ok: true; value: Value; snapshot?: SessionSnapshot }
  | CommandFailure;

/**
 * What a browser-only command acts on in the browser tab: the open session's
 * stores and app actions that need DOM or browser-side fetch/CORS access.
 */
export type CommandApp = {
  stores: GenomeBrowserStores;
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
    requests: readonly TrackRequest[],
    signal: AbortSignal,
  ): Promise<UrlTracksOutcome>;
};

type CommandBase<
  Params extends z.ZodObject = z.ZodObject,
  Result extends z.ZodObject = z.ZodObject,
> = {
  /** Tool name, in snake_case. */
  name: string;
  /** Shown to agents. Say what the command does and how to fill in its parameters. */
  description: string;
  params: Params;
  result: Result;
  /**
   * How long the tab may take to reply, in milliseconds, when five seconds is not enough. The
   * MCP route's `maxDuration` must outlast it.
   */
  timeoutMs?: number;
};

/**
 * A command that operates purely on `SessionSnapshot`. MCP runs it directly on
 * the server (with 0..N open tabs) through `SessionService`.
 */
export type StateCommand<
  Params extends z.ZodObject = z.ZodObject,
  Result extends z.ZodObject = z.ZodObject,
> = CommandBase<Params, Result> & {
  target: "state";
  /** `"read"` loads from PostgreSQL without writing; `"write"` persists via `SessionService.mutate`. */
  access: "read" | "write";
  run(snapshot: SessionSnapshot, params: z.output<Params>): StateCommandOutcome<z.input<Result>>;
};

/**
 * A command that requires browser DOM/CORS access (`export_image`, `add_tracks_from_urls`).
 * MCP relays it to the session's attached browser tab.
 */
export type BrowserCommand<
  Params extends z.ZodObject = z.ZodObject,
  Result extends z.ZodObject = z.ZodObject,
> = CommandBase<Params, Result> & {
  target: "browser";
  run(
    app: CommandApp,
    params: z.output<Params>,
    signal: AbortSignal,
  ): CommandOutcome<z.input<Result>> | Promise<CommandOutcome<z.input<Result>>>;
};

export type Command<
  Params extends z.ZodObject = z.ZodObject,
  Result extends z.ZodObject = z.ZodObject,
> = StateCommand<Params, Result> | BrowserCommand<Params, Result>;

export function defineStateCommand<Params extends z.ZodObject, Result extends z.ZodObject>(
  command: Omit<StateCommand<Params, Result>, "target">,
): StateCommand<Params, Result> {
  return { target: "state", ...command };
}

export function defineBrowserCommand<Params extends z.ZodObject, Result extends z.ZodObject>(
  command: Omit<BrowserCommand<Params, Result>, "target">,
): BrowserCommand<Params, Result> {
  return { target: "browser", ...command };
}
