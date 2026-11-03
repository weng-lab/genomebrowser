import { getSessions, getAccountSettings } from "../../../../../composition/server";
import { remoteControlDenied } from "../../../../../features/account/server/http";
import { getCommandRelay } from "../../../../../features/agent/commands/server/relay";
import {
  openCommandStream,
  receiveCommandReply,
} from "../../../../../features/agent/commands/server/http";

// The tab reconnects when the stream ends, so it need not outlive one function invocation.
export const maxDuration = 300;

/** The open tab's stream of agent commands for this session. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/commands">,
) {
  const denied = await remoteControlDenied(async () => (await getAccountSettings()).get());
  if (denied) return denied;
  return openCommandStream(request, (await params).id, { getSessions, relay: getCommandRelay() });
}

/** The tab's reply to one command. */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/sessions/[id]/commands">,
) {
  const denied = await remoteControlDenied(async () => (await getAccountSettings()).get());
  if (denied) return denied;
  return receiveCommandReply(request, (await params).id, { getSessions, relay: getCommandRelay() });
}
