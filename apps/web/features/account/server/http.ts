import "server-only";
import { readJsonBody } from "../../../shared/server/readJsonBody";
import { AccountSettingsError } from "../settings";

const statuses = { UNAUTHENTICATED: 401, INVALID_INPUT: 400, UNAVAILABLE: 503 };

/** Run one account settings operation. Any failure other than a settings error is logged and reported without detail. */
export async function respondWithSettings(operation: () => Promise<unknown>) {
  const headers = { "Cache-Control": "no-store" };
  try {
    return Response.json(await operation(), { headers });
  } catch (error) {
    if (error instanceof AccountSettingsError) {
      return Response.json(
        { code: error.code, message: error.message },
        { status: statuses[error.code], headers },
      );
    }
    console.error("Account settings request failed", error);
    return Response.json({ message: "Account settings are unavailable" }, { status: 500, headers });
  }
}

/** Read a settings body of at most 1 KB. */
export function readSettings(request: Request) {
  return readJsonBody(request, {
    maxBytes: 1024,
    tooLarge: () => new AccountSettingsError("INVALID_INPUT", "Settings are limited to 1 KB"),
    invalid: () => new AccountSettingsError("INVALID_INPUT", "The request body must be JSON"),
  });
}
