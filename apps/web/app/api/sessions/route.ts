import { getSessions } from "../../../composition/server";
import { readSessionInput, respond } from "../../../features/sessions/server/http";

export function GET() {
  return respond(async () => (await getSessions()).list());
}

export function POST(request: Request) {
  return respond(async () => (await getSessions()).create(await readSessionInput(request)));
}
