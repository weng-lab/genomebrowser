import { getSessionService } from "../../../composition/server";
import { readSessionInput, respond } from "../../../features/sessions/server/http";

export function GET() {
  return respond(async () => (await getSessionService()).list());
}

export function POST(request: Request) {
  return respond(async () => (await getSessionService()).create(await readSessionInput(request)));
}
