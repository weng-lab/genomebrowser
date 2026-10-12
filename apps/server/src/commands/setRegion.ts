import type { Context } from "hono";
import { regionSchema } from "../protocol.ts";
import type { BrowserRelay } from "../relay.ts";

/** Validate the command input and ask the relay to await the browser's result. */
export async function setRegion(c: Context, relay: BrowserRelay) {
  const parsed = regionSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid region" }, 400);
  return relay.dispatchCommand(
    c.req.param().clientId,
    { type: "region.set", region: parsed.data },
    c.req.raw.signal,
  );
}
