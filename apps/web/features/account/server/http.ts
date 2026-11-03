import "server-only";
import { AccountSettingsError } from "./settings";
import type { AccountSettings } from "../settings";

/** Command routes enforce the preference again, independently of the browser switch. */
export async function remoteControlDenied(getSettings: () => Promise<AccountSettings>) {
  try {
    if ((await getSettings()).remoteControlEnabled) return null;
    return Response.json(
      { message: "Remote control is disabled for this account" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return respondAccountSettings(async () => {
      throw error;
    });
  }
}

export async function respondAccountSettings(operation: () => Promise<unknown>) {
  const headers = { "Cache-Control": "no-store" };
  try {
    return Response.json(await operation(), { headers });
  } catch (error) {
    if (error instanceof AccountSettingsError)
      return Response.json({ message: error.message }, { status: error.status, headers });
    console.error("Account settings request failed", error);
    return Response.json({ message: "Account settings are unavailable" }, { status: 500, headers });
  }
}

export async function readAccountSettings(request: Request) {
  const body = await request.text();
  if (body.length > 4096) throw new AccountSettingsError(400, "Account settings are too large");
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new AccountSettingsError(400, "The request body must be JSON");
  }
}
