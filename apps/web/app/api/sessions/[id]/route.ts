import { getSessionService } from "../../../../composition/server";
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
  return respond(async () =>
    (await getSessionService()).patch((await params).id, await readSessionPatch(request)),
  );
}

export function DELETE(_request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => (await getSessionService()).remove((await params).id));
}
