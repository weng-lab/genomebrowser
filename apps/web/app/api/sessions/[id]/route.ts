import { getSessions } from "../../../../composition/server";
import { readSessionUpdate, respond } from "../../../../features/sessions/server/http";

export function GET(_request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => getSessions().load((await params).id));
}

/**
 * Replace the name and snapshot at the revision the edits were based on. A
 * deleted session stays deleted; a retried save ID is not applied again.
 */
export function PUT(request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () =>
    getSessions().update((await params).id, await readSessionUpdate(request)),
  );
}

export function DELETE(_request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => getSessions().remove((await params).id));
}
