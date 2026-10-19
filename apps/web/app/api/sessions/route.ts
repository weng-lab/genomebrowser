import { readSessionInput, respond } from "../../../server/sessions/http";

export function GET() {
  return respond((sessions) => sessions.list());
}

export function POST(request: Request) {
  return respond(async (sessions) => sessions.create(await readSessionInput(request)));
}
