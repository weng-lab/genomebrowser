import {
  commands,
  type Command,
  type CommandMessage,
  type CommandResult,
} from "@weng-lab/contracts";
import {
  exportBrowserImage,
  type BrowserImage,
  type GenomeBrowserStores,
} from "@weng-lab/genomebrowser";
import type { z } from "zod";

/**
 * What commands act on. Today, the open session's stores, the same ones the UI
 * uses, and the preview that shows exported images to the user. Add other app
 * capabilities here when a command needs them.
 */
export type CommandCapabilities = {
  stores: GenomeBrowserStores;
  showImage: (image: BrowserImage) => void;
};

type Failure = { ok: false; code: string; error: string };
type Outcome<C extends Command> = { ok: true; value: z.infer<C["result"]> } | Failure;
type Handler<C extends Command> = (
  app: CommandCapabilities,
  params: z.infer<C["params"]>,
  signal: AbortSignal,
) => Outcome<C> | Promise<Outcome<C>>;

/**
 * How the app carries out each command. Call an existing action rather than
 * reimplementing it, and return its outcome. Edits must happen synchronously, so
 * they cannot land after `signal` aborts; asynchronous work checks `signal` before
 * any effect the user would see.
 */
const handlers: { [C in Command as C["name"]]: Handler<C> } = {
  set_region({ stores }, { region }) {
    const outcome = stores.useBrowserStore.getState().setRegion(region);
    if (!outcome.ok) return outcome;
    return { ok: true, value: { region: outcome.region, clamped: outcome.clamped } };
  },
  async export_image({ stores, showImage }, { format, filename, ...options }, signal) {
    try {
      const image = await exportBrowserImage(
        stores.useBrowserStore,
        format,
        { ...options, filename },
        signal,
      );
      signal.throwIfAborted();
      showImage(image);
      const { width, height } = image;
      return { ok: true, value: { filename: image.filename, format, width, height } };
    } catch (cause) {
      if (signal.aborted)
        return { ok: false, code: "CANCELLED", error: "The export was cancelled" };
      const error = cause instanceof Error ? cause.message : "The image could not be exported";
      return { ok: false, code: "EXPORT_FAILED", error };
    }
  },
};

/**
 * Validate a delivered command's parameters and run it with `app`. Synchronous
 * handlers finish before this returns its promise.
 */
export async function executeCommand(
  app: CommandCapabilities,
  message: CommandMessage,
  signal: AbortSignal,
): Promise<CommandResult> {
  const command = commands.find(({ name }) => name === message.name);
  if (!command) return { ok: false, code: "UNKNOWN_COMMAND", error: `No command ${message.name}` };
  const params = command.params.safeParse(message.params);
  if (!params.success) {
    return { ok: false, code: "INVALID_PARAMS", error: "Invalid command parameters" };
  }
  // TypeScript cannot relate a looked-up handler to its command's schema.
  const handler = handlers[command.name] as Handler<typeof command>;
  const outcome = await handler(app, params.data, signal);
  return outcome.ok ? outcome : { ok: false, code: outcome.code, error: outcome.error };
}
