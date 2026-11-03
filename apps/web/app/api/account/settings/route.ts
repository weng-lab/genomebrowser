import { getAccountSettings } from "../../../../composition/server";
import {
  readAccountSettings,
  respondAccountSettings,
} from "../../../../features/account/server/http";

export function GET() {
  return respondAccountSettings(async () => (await getAccountSettings()).get());
}

export function PUT(request: Request) {
  return respondAccountSettings(async () =>
    (await getAccountSettings()).update(await readAccountSettings(request)),
  );
}
