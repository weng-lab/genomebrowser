import { getAgentThreads, getTabAccount } from "../../../../../composition/server";
import { clerkIdentity } from "../../../../../features/account/server/identity";
import { authorizeAgentSession } from "../../../../../features/agent/server/http";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/agent-auth">,
) {
  const { id } = await params;
  return authorizeAgentSession(request, id, {
    userId: () => clerkIdentity.userId(),
    account: getTabAccount,
    threads: getAgentThreads,
  });
}
