import { sessionIdSchema } from "../../features/sessions/schema";
import { localDev, type AuthFn } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

const development = localDev();
const proxyOrigins = (process.env.GB_AGENT_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
for (const origin of proxyOrigins) {
  if (new URL(origin).origin !== origin) throw new Error("Invalid GB_AGENT_DEV_ORIGINS origin");
}

// MCP is loopback-only and unauthenticated. Keep the panel local until both
// services have real session authorization; a session ID is not a credential.
const browserSession: AuthFn<Request> = async (request) => {
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
  const session = sessionIdSchema.safeParse(request.headers.get("x-genomebrowser-session-id"));
  if (!session.success) return null;
  return {
    ...caller,
    principalId: session.data,
    attributes: { browserSessionId: session.data },
  };
};

export default eveChannel({ auth: [browserSession] });
