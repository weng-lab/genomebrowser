import { getAgentThreads, getTabAccount } from "../../../../../../composition/server";
import { copyAgentThread } from "../../../../../../features/agent/server/http";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/agent-thread/copy">,
) {
  const { id } = await params;
  return copyAgentThread(request, id, { account: getTabAccount, threads: getAgentThreads });
}
