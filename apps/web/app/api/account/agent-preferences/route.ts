import { getAccountSettings } from "../../../../composition/server";
import { readSettings, respondWithSettings } from "../../../../features/account/server/http";

export function GET() {
  return respondWithSettings(async () => (await getAccountSettings()).agentPreferences());
}

// 1,000 characters can take several bytes each once encoded.
export function PUT(request: Request) {
  return respondWithSettings(async () =>
    (await getAccountSettings()).updateAgentPreferences(await readSettings(request, 8 * 1024)),
  );
}
