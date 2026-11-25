import "server-only";
import { z } from "zod";
import { readJsonBody } from "../../../shared/server/readJsonBody";
import { sessionIdSchema } from "../../sessions/schema";
import { commandReplySchema } from "../commands/protocol";
import { authorizeRemoteControl, type AgentAccount, type RemoteControlDenial } from "./access";
import type { CommandRelay } from "./relay";
import type { AgentThreads } from "./threads";

/** Resolved for each request, so missing configuration is reported like any other outage. */
type Dependencies = { account: () => Promise<AgentAccount>; relay: () => CommandRelay };
type AgentAuthDependencies = {
  userId: () => Promise<string | null>;
  account: () => Promise<AgentAccount>;
  threads: () => Promise<AgentThreads>;
};
type ThreadDependencies = {
  account: () => Promise<AgentAccount>;
  threads: () => Promise<AgentThreads>;
};
type BindDependencies = ThreadDependencies & {
  userId: () => Promise<string | null>;
  /** What a bind proof from Eve proves, using it up, or null when it proves nothing. */
  proof: (
    token: string,
  ) => Promise<{ userId: string; sessionId: string; conversationId: string } | null>;
};

type EndDependencies = {
  threads: () => Promise<AgentThreads>;
  /** End a conversation in Eve as the request's user, rejecting when Eve cannot confirm it. */
  end: (request: Request, sessionId: string, conversationId: string) => Promise<void>;
};

const conversationSchema = z.object({ conversationId: z.string().min(1).max(200) });

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

/**
 * Authorize the embedded agent to act on `sessionId` for the signed-in account.
 * A request on an existing conversation names it in `conversation`, which must
 * be the session's thread. Stop requests (`control=stop`) skip the Remote
 * Control check, so Stop still works after the preference is turned off.
 */
export async function authorizeAgentSession(
  request: Request,
  sessionId: string,
  { userId, account, threads }: AgentAuthDependencies,
) {
  const stopping = new URL(request.url).searchParams.get("control") === "stop";
  try {
    const actingUser = await userId();
    if (!actingUser) return error(401, "UNAUTHENTICATED", "Sign in to use remote control");
    if (!sessionIdSchema.safeParse(sessionId).success)
      return error(404, "NOT_FOUND", "Session not found");
    if (!stopping) {
      const denied = await authorizeRemoteControl(await account(), sessionId);
      if (denied) return error(statuses[denied.code], denied.code, denied.error);
    }
    // Only a conversation's own session may read, continue, or stop it.
    const conversation = new URL(request.url).searchParams.get("conversation");
    const foreign = conversation
      ? !(await (await threads()).owns(sessionId, conversation))
      : stopping;
    if (foreign)
      return error(403, "FORBIDDEN", "This agent conversation is not this session's thread");
    return Response.json({ userId: actingUser, browserSessionId: sessionId }, { headers: noStore });
  } catch (cause) {
    console.error("Agent session authorization failed", cause);
    return error(503, "UNAVAILABLE", "Remote control is unavailable");
  }
}

/** The session's current agent conversation, or null before its first message. */
export function readAgentThread(sessionId: string, { account, threads }: ThreadDependencies) {
  return authorized(sessionId, account, async () =>
    Response.json(
      { conversationId: await (await threads()).current(sessionId) },
      { headers: noStore },
    ),
  );
}

/**
 * Record a conversation Eve just created as the session's thread. Eve's bind
 * proof must name this user, session, and conversation, so no caller can claim
 * a conversation Eve did not create for them. Refused with 409 when the session
 * already has another one, such as one another tab started.
 */
export function bindAgentThread(
  request: Request,
  sessionId: string,
  { account, threads, userId, proof }: BindDependencies,
) {
  return authorized(sessionId, account, async () => {
    const token = request.headers.get("x-genomebrowser-bind-proof");
    const proven = token ? await proof(token) : null;
    let body: unknown;
    try {
      body = await readJsonBody(request, {
        maxBytes: 1_024,
        tooLarge: () => new SyntaxError(),
        invalid: () => new SyntaxError(),
      });
    } catch {
      return error(400, "INVALID_INPUT", "The request body must be JSON");
    }
    const input = conversationSchema.safeParse(body);
    if (!input.success) return error(400, "INVALID_INPUT", "Invalid conversation ID");
    if (
      !proven ||
      proven.userId !== (await userId()) ||
      proven.sessionId !== sessionId ||
      proven.conversationId !== input.data.conversationId
    )
      return error(403, "FORBIDDEN", "Only the agent can record a session's conversation");
    if (!(await (await threads()).bind(sessionId, input.data.conversationId)))
      return error(409, "CONFLICT", "This session already has another agent conversation");
    return Response.json(input.data, { headers: noStore });
  });
}

/** Release the session's thread named by `conversation`, such as one Eve no longer has. */
export function releaseAgentThread(
  request: Request,
  sessionId: string,
  { account, threads }: ThreadDependencies,
) {
  return authorized(sessionId, account, async () => {
    const conversation = new URL(request.url).searchParams.get("conversation");
    if (!conversation) return error(400, "INVALID_INPUT", "Name the conversation to release");
    await (await threads()).release(sessionId, conversation);
    return new Response(null, { status: 204, headers: noStore });
  });
}

/**
 * End the agent conversation of a session about to be deleted, if the acting
 * user owns the session and it has one, and keep it from gaining another. Eve
 * keeps a conversation's messages until it ends, and the thread record that
 * names it is deleted with the session. Rejects when Eve cannot confirm the
 * end, so the caller keeps the session and the deletion can be retried.
 */
export async function endAgentThread(
  request: Request,
  sessionId: string,
  { threads, end }: EndDependencies,
) {
  const conversationId = await (await threads()).close(sessionId);
  if (conversationId) await end(request, sessionId, conversationId);
}
