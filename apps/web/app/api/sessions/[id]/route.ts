import { getAgentThreads, getSessions } from "../../../../composition/server";
import { endConversation } from "../../../../features/agent/server/conversations";
import { endAgentThread } from "../../../../features/agent/server/http";
import { readSessionUpdate, respond } from "../../../../features/sessions/server/http";

export function GET(_request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => (await getSessions()).load((await params).id));
}

/**
 * Replace the name and snapshot at the revision the edits were based on. A
 * deleted session stays deleted; a retried save ID is not applied again.
 */
export function PUT(request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () =>
    (await getSessions()).update((await params).id, await readSessionUpdate(request)),
  );
}

/**
 * Delete the session with its agent thread. The thread's conversation is ended
 * first, so Eve stops holding its messages; if Eve cannot confirm that, the
 * session is kept and the deletion can be retried.
 */
export function DELETE(request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => {
    const { id } = await params;
    await endAgentThread(request, id, { threads: getAgentThreads, end: endConversation });
    await (await getSessions()).remove(id);
  });
}
