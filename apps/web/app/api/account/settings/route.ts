import { getAccountSettings } from "../../../../composition/server";
import { readSettings, respondWithSettings } from "../../../../features/account/server/http";

export function GET() {
  return respondWithSettings(async () => (await getAccountSettings()).get());
}

export function PUT(request: Request) {
  return respondWithSettings(async () =>
    (await getAccountSettings()).update(await readSettings(request)),
  );
}
