import { getAgentThreads, getSessionService } from "../../../../composition/server";
import { endConversation } from "../../../../features/agent/server/conversations";
import { endAgentThread } from "../../../../features/agent/server/http";
import {
  readSessionPatch,
  readSessionUpdate,
  respond,
} from "../../../../features/sessions/server/http";

export function GET(_request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => (await getSessionService()).load((await params).id));
}

/**
 * Replace the name and snapshot at the revision the edits were based on. A
 * deleted session stays deleted; a retried save ID is not applied again.
 */
export function PUT(request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () =>
    (await getSessionService()).update((await params).id, await readSessionUpdate(request)),
  );
}

/**
 * Apply a partial live edit (`SessionPatch`) from an open tab, merging cleanly
 * with concurrent edits and broadcasting the new revision to all open tabs.
 */
export function PATCH(request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => {
    const service = await getSessionService();
    const { id } = await params;
    await service.authorize(id);
    return service.patch(id, await readSessionPatch(request));
  });
}

/**
 * Delete the session with its agent thread and notify open tabs. The thread's
 * conversation is ended first, so Eve stops holding its messages; if Eve cannot
 * confirm that, the session is kept and the deletion can be retried.
 */
export function DELETE(request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => {
    const { id } = await params;
    await endAgentThread(request, id, { threads: getAgentThreads, end: endConversation });
    await (await getSessionService()).remove(id);
  });
}
