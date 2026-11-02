import "server-only";
import { z } from "zod";
import type { Sessions } from "../../../sessions/server/sessions";
import { respond } from "../../../sessions/server/http";
import { commandReplySchema } from "../protocol";
import type { CommandRelay } from "./relay";

type Dependencies = { getSessions: () => Promise<Sessions>; relay: CommandRelay };

const noStore = { "Cache-Control": "no-store" };
const maxReplyBytes = 1_048_576;

function error(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: noStore });
}

/** Session errors as the session routes report them, or null when the acting user owns it. */
async function authorize(getSessions: () => Promise<Sessions>, sessionId: string) {
  const response = await respond(async () => (await getSessions()).authorize(sessionId));
  return response.ok ? null : response;
}

/**
 * Open the SSE stream of agent commands for the browser tab named by the `tab`
 * query parameter. Only the signed-in owner of the session may connect, and
 * only one tab at a time; another tab gets 409 until this one disconnects.
 */
export async function openCommandStream(
  request: Request,
  sessionId: string,
  { getSessions, relay }: Dependencies,
) {
  const tabId = z.uuid().safeParse(new URL(request.url).searchParams.get("tab"));
  if (!tabId.success) return error(400, "Invalid tab ID");
  const denied = await authorize(getSessions, sessionId);
  if (denied) return denied;
  const stream = await relay.connect(sessionId, tabId.data, request.signal);
  if (!stream) return error(409, "The session is already connected in another tab");
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Deliver a tab's reply to the command waiting for it. */
export async function receiveCommandReply(
  request: Request,
  sessionId: string,
  { getSessions, relay }: Dependencies,
) {
  const denied = await authorize(getSessions, sessionId);
  if (denied) return denied;
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxReplyBytes) {
    return error(413, "Request body is too large");
  }
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return error(400, "Invalid JSON request");
  }
  const reply = commandReplySchema.safeParse(json);
  if (!reply.success) return error(400, "Invalid command reply");
  if (!(await relay.acknowledge(sessionId, reply.data))) {
    return error(409, "Command is not pending for this session");
  }
  return Response.json({ ok: true }, { headers: noStore });
}
