import "server-only";
import { z } from "zod";
import { readJsonBody } from "../../../shared/server/readJsonBody";
import { commandReplySchema } from "../commands/protocol";
import { authorizeRemoteControl, type AgentAccount, type RemoteControlDenial } from "./access";
import type { CommandRelay } from "./relay";

/** Resolved for each request, so missing configuration is reported like any other outage. */
type Dependencies = { account: () => Promise<AgentAccount>; relay: () => CommandRelay };

const noStore = { "Cache-Control": "no-store" };
const statuses: Record<RemoteControlDenial["code"], number> = {
  UNAUTHENTICATED: 401,
  REMOTE_CONTROL_DISABLED: 403,
  NOT_FOUND: 404,
};

function error(status: number, code: string, message: string) {
  return Response.json({ code, message }, { status, headers: noStore });
}

/** Run one tab request for the session, once the acting account may control it remotely. */
async function authorized(
  sessionId: string,
  account: () => Promise<AgentAccount>,
  operation: () => Promise<Response>,
) {
  try {
    const denied = await authorizeRemoteControl(await account(), sessionId);
    if (denied) return error(statuses[denied.code], denied.code, denied.error);
    return await operation();
  } catch (cause) {
    console.error("Remote control request failed", cause);
    return error(503, "UNAVAILABLE", "Remote control is unavailable");
  }
}

/**
 * Open the SSE stream of agent commands for one connection of the browser tab
 * named by the `tab` query parameter. A tab keeps the same ID while it
 * reconnects; another tab is refused with 409 while one holds the session.
 */
export function openCommandStream(
  request: Request,
  sessionId: string,
  { account, relay }: Dependencies,
) {
  const tabId = z.uuid().safeParse(new URL(request.url).searchParams.get("tab"));
  if (!tabId.success) return Promise.resolve(error(400, "INVALID_INPUT", "Invalid tab ID"));
  return authorized(sessionId, account, async () => {
    const stream = await relay().attach(sessionId, tabId.data, request.signal);
    if (stream === "taken")
      return error(409, "TAKEN", "The session is already connected in another tab");
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  });
}

/** Deliver a tab's reply, of at most 1 MB, to the command waiting for it. */
export function receiveCommandReply(
  request: Request,
  sessionId: string,
  { account, relay }: Dependencies,
) {
  return authorized(sessionId, account, async () => {
    let body: unknown;
    try {
      body = await readJsonBody(request, {
        maxBytes: 1_048_576,
        tooLarge: () => new RangeError(),
        invalid: () => new SyntaxError(),
      });
    } catch (cause) {
      if (cause instanceof RangeError)
        return error(413, "INVALID_INPUT", "Replies are limited to 1 MB");
      return error(400, "INVALID_INPUT", "The request body must be JSON");
    }
    const reply = commandReplySchema.safeParse(body);
    if (!reply.success) return error(400, "INVALID_INPUT", "Invalid command reply");
    if (!(await relay().reply(sessionId, reply.data)))
      return error(409, "NOT_PENDING", "Command is not pending for this session");
    return Response.json({ ok: true }, { headers: noStore });
  });
}
