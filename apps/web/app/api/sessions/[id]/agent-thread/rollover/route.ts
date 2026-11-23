import { getAgentThreads, getTabAccount } from "../../../../../../composition/server";
import { rollOverAgentThread } from "../../../../../../features/agent/server/http";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/agent-thread/rollover">,
) {
  const { id } = await params;
  return rollOverAgentThread(request, id, { account: getTabAccount, threads: getAgentThreads });
}
