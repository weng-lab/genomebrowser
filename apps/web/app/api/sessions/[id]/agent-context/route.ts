import { getAgentAccountForUser } from "../../../../../composition/server";
import { readCommandCredential } from "../../../../../features/agent/server/credential";
import { readAgentContext } from "../../../../../features/agent/server/http";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/agent-context">,
) {
  const { id } = await params;
  return readAgentContext(request, id, {
    credential: readCommandCredential,
    account: getAgentAccountForUser,
  });
}
