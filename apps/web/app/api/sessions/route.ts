import { getSessions } from "../../../composition/server";
import { readSessionInput, respond } from "../../../features/sessions/server/http";

export function GET() {
  return respond(() => getSessions().list());
}

export function POST(request: Request) {
  return respond(async () => getSessions().create(await readSessionInput(request)));
}
