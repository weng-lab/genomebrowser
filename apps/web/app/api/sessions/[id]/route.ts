import { getSessions } from "../../../../composition/server";
import { readSessionInput, respond } from "../../../../features/sessions/server/http";

export function GET(_request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => getSessions().load((await params).id));
}

/** Replace the name and snapshot. A deleted session stays deleted. */
export function PUT(request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () =>
    getSessions().update((await params).id, await readSessionInput(request)),
  );
}

export function DELETE(_request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async () => getSessions().remove((await params).id));
}
