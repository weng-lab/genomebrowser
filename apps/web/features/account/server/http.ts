import "server-only";
import { readJsonBody } from "../../../shared/server/readJsonBody";
import { createResponder } from "../../../shared/server/respond";
import { AccountSettingsError } from "../settings";

/** Run one account settings operation. */
export const respondWithSettings = createResponder(
  AccountSettingsError,
  { UNAUTHENTICATED: 401, INVALID_INPUT: 400, UNAVAILABLE: 503 },
  { log: "Account settings request failed", message: "Account settings are unavailable" },
);

/** Read a settings body of at most `maxBytes`, 1 KB by default. */
export function readSettings(request: Request, maxBytes = 1024) {
  return readJsonBody(request, {
    maxBytes,
    tooLarge: () =>
      new AccountSettingsError("INVALID_INPUT", `Settings are limited to ${maxBytes / 1024} KB`),
    invalid: () => new AccountSettingsError("INVALID_INPUT", "The request body must be JSON"),
  });
}
