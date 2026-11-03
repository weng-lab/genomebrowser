import { sessionIdSchema } from "../../features/sessions/schema";
import { ForbiddenError, localDev, routeAuth, type AuthFn } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import type { RouteHandlerArgs } from "eve/channels";
import { z } from "zod";
import { bindConversation, canAccessConversation } from "../../features/agent/conversationAccess";

const development = localDev();
const proxyOrigins = (process.env.GB_AGENT_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
for (const origin of proxyOrigins) {
  if (new URL(origin).origin !== origin) throw new Error("Invalid GB_AGENT_DEV_ORIGINS origin");
}

const browserSession: AuthFn<Request> = async (request) => {
  const session = sessionIdSchema.safeParse(request.headers.get("x-genomebrowser-session-id"));
  if (!session.success) return null;
  const appOrigin =
    process.env.GB_AGENT_APP_ORIGIN?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (appOrigin) {
    // The destination comes from deployment configuration, never a caller's Host/Origin.
    const url = new URL(`/api/sessions/${session.data}/agent-auth`, appOrigin);
    if (
      request.method === "POST" &&
      /\/session\/[^/]+\/(cancel|end)$/.test(new URL(request.url).pathname)
    )
      url.searchParams.set("control", "stop");
    const headers = new Headers();
    for (const name of ["cookie", "authorization"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await fetch(url, {
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
    });
    if (response.status === 401) return null;
    if (response.status === 403 || response.status === 404)
      throw new ForbiddenError({
        message: "Agent access is disabled or this session is not yours",
      });
    if (!response.ok) throw new Error("The app could not authorize this agent request");
    const caller = z
      .object({ userId: z.string().min(1), browserSessionId: sessionIdSchema })
      .parse(await response.json());
    if (caller.browserSessionId !== session.data)
      throw new Error("Agent session authorization mismatch");
    return {
      authenticator: "app-session",
      principalType: "user",
      principalId: `${caller.userId}:${session.data}`,
      attributes: { browserSessionId: session.data },
    };
  }
  // An explicitly trusted private proxy connects to Eve over loopback. Accept
  // its browser origin without bypassing localDev's environment/host/peer checks.
  const origin = request.headers.get("origin");
  let localRequest = request;
  if (origin !== null && proxyOrigins.includes(origin)) {
    const headers = new Headers(request.headers);
    headers.delete("origin");
    localRequest = new Request(request.url, { headers });
  }
  const caller = await development(localRequest);
  if (!caller) return null;
  return {
    ...caller,
    principalId: session.data,
    attributes: { browserSessionId: session.data },
  };
};

const verified = new WeakMap<Request, Awaited<ReturnType<typeof browserSession>>>();
const channel = eveChannel({
  auth: [(request) => verified.get(request) ?? browserSession(request)],
});

// Eve authenticates routes but deliberately supplies no per-conversation ACL.
// Guard every session read/control as well as messages; preserve framework callbacks.
export default {
  ...channel,
  routes: channel.routes.map((route) => {
    if (route.transport !== "http" || !route.path.startsWith("/eve/v1/session")) return route;
    return {
      ...route,
      async handler(request: Request, context: RouteHandlerArgs) {
        const caller = await routeAuth(request, browserSession);
        if (caller instanceof Response) return caller;
        const conversation = context.params.sessionId ?? context.params.parentSessionId;
        if (conversation && !(await canAccessConversation(conversation, caller.principalId)))
          return Response.json(
            { error: "This agent conversation is not yours or has expired" },
            { status: 403 },
          );
        verified.set(request, caller);
        try {
          const response = await route.handler(request, context);
          if (response.ok && route.path === "/eve/v1/session" && route.method === "POST") {
            const result = (await response.clone().json()) as { sessionId?: string };
            if (result.sessionId) await bindConversation(result.sessionId, caller.principalId);
          }
          return response;
        } finally {
          verified.delete(request);
        }
      },
    };
  }),
} satisfies typeof channel;
