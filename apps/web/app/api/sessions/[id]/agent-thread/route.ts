import { getAgentThreads, getTabAccount } from "../../../../../composition/server";
import {
  bindAgentThread,
  readAgentThread,
  releaseAgentThread,
} from "../../../../../features/agent/server/http";

const dependencies = { account: getTabAccount, threads: getAgentThreads };

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/sessions/[id]/agent-thread">,
) {
  const { id } = await params;
  return readAgentThread(id, dependencies);
}

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/agent-thread">,
) {
  const { id } = await params;
  return bindAgentThread(request, id, dependencies);
}

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/agent-thread">,
) {
  const { id } = await params;
  return releaseAgentThread(request, id, dependencies);
}
