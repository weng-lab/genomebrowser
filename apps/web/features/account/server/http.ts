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
  const tooLarge = () => new AccountSettingsError(400, "Account settings are too large");
  if (Number(request.headers.get("content-length")) > 4096) throw tooLarge();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) as unknown;
  } catch {
    throw new AccountSettingsError(400, "The request body must be JSON");
  }
}
