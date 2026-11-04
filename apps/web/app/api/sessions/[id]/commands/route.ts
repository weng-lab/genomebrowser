import { getCommandRelay, getTabAccount } from "../../../../../composition/server";
import { openCommandStream, receiveCommandReply } from "../../../../../features/agent/server/http";

// A stream ends itself before this, and the tab reconnects.
export const maxDuration = 300;

/** The stream of agent commands for one connection of the tab showing this session. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/commands">,
) {
  return openCommandStream(request, (await params).id, {
    account: getTabAccount,
    relay: getCommandRelay,
  });
}

/** The tab's reply to one command. */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/commands">,
) {
  return receiveCommandReply(request, (await params).id, {
    account: getTabAccount,
    relay: getCommandRelay,
  });
}
