import type { RouteHandlerArgs } from "eve/channels";
import { ForbiddenError, localDev, routeAuth, type AuthFn } from "eve/channels/auth";
import { eveChannel, type EveAuthFn } from "eve/channels/eve";
import { z } from "zod";
import { issueBindProof } from "../../features/agent/server/credential";
import { agentAppOrigin, agentDeploymentHeaders } from "../../features/agent/server/deployment";
import { sessionIdSchema } from "../../features/sessions/schema";

const authResponseSchema = z.object({
  userId: z.string().min(1),
  browserSessionId: sessionIdSchema,
});

const stopPath = /\/session\/[^/]+\/(cancel|end|reset)$/;

/** Headers for a call back to the app on behalf of the request's signed-in user. */
async function forwardedHeaders(request: Request) {
  const headers = new Headers(await agentDeploymentHeaders());
  for (const name of ["cookie", "authorization"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

/** The browser session a request acts on, and, for an existing conversation, its ID. */
const authorize =
  (conversation?: string): AuthFn<Request> =>
  async (request) => {
    const session = sessionIdSchema.safeParse(request.headers.get("x-genomebrowser-session-id"));
    if (!session.success) return null;
    // Always call back to this deployment's configured origin, never a caller's Host or Origin.
    const url = new URL(`/api/sessions/${session.data}/agent-auth`, agentAppOrigin());
    if (request.method === "POST" && stopPath.test(new URL(request.url).pathname))
      url.searchParams.set("control", "stop");
    if (conversation) url.searchParams.set("conversation", conversation);
    const response = await fetch(url, {
      headers: await forwardedHeaders(request),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
    });
    if (response.status === 401) return null;
    if (response.status === 403 || response.status === 404)
      throw new ForbiddenError({
        message: "Agent access is disabled, or this session or conversation is not yours",
      });
    if (!response.ok) throw new Error("The app could not authorize this agent request");
    const caller = authResponseSchema.parse(await response.json());
    if (caller.browserSessionId !== session.data)
      throw new Error("Agent session authorization mismatch");
    return {
      authenticator: "app-session",
      principalType: "user" as const,
      principalId: `${caller.userId}:${session.data}`,
      attributes: { browserSessionId: session.data, userId: caller.userId },
    };
  };

/**
 * Record a new conversation as its browser session's thread. Resolves the app's
 * status: 409 when the session already has another thread.
 */
async function bindThread(
  request: Request,
  { userId, browserSessionId }: { userId: string; browserSessionId: string },
  conversationId: string,
) {
  const headers = await forwardedHeaders(request);
  headers.set("content-type", "application/json");
  headers.set(
    "x-genomebrowser-bind-proof",
    await issueBindProof(userId, browserSessionId, conversationId),
  );
  const url = new URL(`/api/sessions/${browserSessionId}/agent-thread`, agentAppOrigin());
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ conversationId }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  return response.status;
}

/** The browser session evaluation conversations act on; no tab holds it. */
export const evaluationSessionId = "00000000-0000-4000-8000-00000000e7a1";
const local = localDev();

/**
 * `eve eval`'s own requests, only while running evals locally: `GB_AGENT_EVALS=1`
 * under `eve dev`, which `localDev()` checks. Operator reads such as
 * `/eve/v1/info` get the local developer; conversations get a stand-in user who
 * may stub tools, since the browser tools need a user and evals have no tab.
 */
const evaluation: EveAuthFn = async (request) => {
  if (process.env.GB_AGENT_EVALS !== "1") return null;
  const developer = await local(request);
  if (!developer) return null;
  if (!new URL(request.url).pathname.startsWith("/eve/v1/session")) return developer;
  return {
    authenticator: "genomebrowser-eval",
    principalType: "user" as const,
    principalId: "eval-user",
    attributes: { userId: "eval-user", browserSessionId: evaluationSessionId, evaluation: "true" },
    allowToolStubs: true,
  };
};

const verified = new WeakMap<Request, Awaited<ReturnType<EveAuthFn>>>();
const channel = eveChannel({
  auth: [(request) => verified.get(request) ?? authorize()(request), evaluation],
});

// Eve authenticates routes but supplies no per-conversation ACL. The app keeps
// each browser session's thread: a new conversation becomes it, and every read,
// follow-up, and control must name it.
export default {
  ...channel,
  routes: channel.routes.map((route) => {
    if (route.transport !== "http" || !route.path.startsWith("/eve/v1/session")) return route;
    return {
      ...route,
      async handler(request: Request, context: RouteHandlerArgs) {
        const conversation = context.params.sessionId ?? context.params.parentSessionId;
        const caller = await routeAuth(
          request,
          async (incoming) =>
            (await authorize(conversation)(incoming)) ?? (await evaluation(incoming)),
        );
        if (caller instanceof Response) return caller;
        verified.set(request, caller);
        try {
          const response = await route.handler(request, context);
          if (response.ok && route.path === "/eve/v1/session" && route.method === "POST") {
            const result = (await response.clone().json()) as { sessionId?: string };
            // Evaluation conversations belong to no saved session, so no thread holds them.
            if (result.sessionId && caller.attributes.evaluation !== "true") {
              const status = await bindThread(
                request,
                {
                  userId: String(caller.attributes.userId),
                  browserSessionId: String(caller.attributes.browserSessionId),
                },
                result.sessionId,
              ).catch(() => 503);
              if (status < 200 || status >= 300) {
                // The new conversation already holds the first message; end it rather than
                // leave a run no thread can reach or stop.
                await context
                  .attachSession(result.sessionId)
                  .end({ auth: caller, reason: "Not the browser session's thread" })
                  .catch((cause: unknown) => {
                    console.error("Could not end an unbound agent conversation", cause);
                  });
                return status === 409
                  ? Response.json(
                      {
                        error:
                          "This session already has another agent conversation. Reload to continue it.",
                      },
                      { status: 409 },
                    )
                  : Response.json(
                      { error: "The agent conversation could not be saved. Try again." },
                      { status: 503 },
                    );
              }
            }
          }
          return response;
        } finally {
          verified.delete(request);
        }
      },
    };
  }),
} satisfies typeof channel;
