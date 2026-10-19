import { readSessionInput, respond } from "../../../../server/sessions/http";

export function GET(_request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async (sessions) => sessions.load((await params).id));
}

/** Replace the name and snapshot. A deleted session stays deleted. */
export function PUT(request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async (sessions) =>
    sessions.update((await params).id, await readSessionInput(request)),
  );
}

export function DELETE(_request: Request, { params }: RouteContext<"/api/sessions/[id]">) {
  return respond(async (sessions) => sessions.remove((await params).id));
}
