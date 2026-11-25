import { getSessionService } from "../../../../../composition/server";
import { openSessionEventStream } from "../../../../../features/sessions/server/http";

// A stream ends itself before this, and the tab reconnects with `sinceRevision`.
export const maxDuration = 300;

/** Real-time SSE stream of session state updates and deletion notices for one open tab. */
export async function GET(request: Request, { params }: RouteContext<"/api/sessions/[id]/events">) {
  return openSessionEventStream(request, (await params).id, getSessionService);
}
