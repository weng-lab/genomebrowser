import { getAccountSettings, getSessions } from "../../../../../composition/server";
import { createIdentity, identityMode } from "../../../../../features/account/server/identity";
import { remoteControlDenied } from "../../../../../features/account/server/http";
import { respond } from "../../../../../features/sessions/server/http";
import { SessionError } from "../../../../../features/sessions/server/sessions";

/** Eve delegates browser-session authorization to the app that owns Clerk and persistence. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/agent-auth">,
) {
  // Stop is checked against the conversation's pinned owner in Eve, so it
  // still works after RC is disabled or the saved browser session is deleted.
  const stopping = new URL(request.url).searchParams.get("control") === "stop";
  if (!stopping) {
    const denied = await remoteControlDenied(async () => (await getAccountSettings()).get());
    if (denied) return denied;
  }
  return respond(async () => {
    const userId = await createIdentity(identityMode(process.env)).userId();
    if (!userId) throw new SessionError("UNAUTHENTICATED", "Sign in to use the agent");
    const { id } = await params;
    if (!stopping) await (await getSessions()).authorize(id);
    return { userId, browserSessionId: id };
  });
}
