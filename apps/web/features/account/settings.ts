import { z } from "zod";

/** Preferences saved for each account. Requests cannot name the account. */
export const accountSettingsSchema = z.strictObject({
  /** Whether agents may control this account's open sessions. New accounts allow it. */
  remoteControl: z.boolean(),
});
export type AccountSettings = z.infer<typeof accountSettingsSchema>;

export const defaultAccountSettings: AccountSettings = { remoteControl: true };

/** Why the settings could not be read or saved. `UNAVAILABLE` may succeed on retry. */
export type AccountSettingsErrorCode = "UNAUTHENTICATED" | "INVALID_INPUT" | "UNAVAILABLE";

export class AccountSettingsError extends Error {
  constructor(
    readonly code: AccountSettingsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AccountSettingsError";
  }
}

const errorBodySchema = z.object({ message: z.string() });

/**
 * The signed-in account's settings from `/api/account/settings`: read them, or
 * save `settings` and receive what was saved. Fails with `AccountSettingsError`.
 */
export async function requestAccountSettings(
  signal: AbortSignal,
  settings?: AccountSettings,
): Promise<AccountSettings> {
  let response: Response;
  let body: unknown;
  try {
    response = await fetch("/api/account/settings", {
      method: settings ? "PUT" : "GET",
      headers: settings ? { "Content-Type": "application/json" } : undefined,
      body: settings ? JSON.stringify(settings) : undefined,
      cache: "no-store",
      signal,
    });
    body = await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    throw unavailable();
  }
  if (response.status === 401) {
    throw new AccountSettingsError("UNAUTHENTICATED", "Sign in to save settings");
  }
  const parsed = accountSettingsSchema.safeParse(body);
  if (response.ok && parsed.success) return parsed.data;
  const rejected = errorBodySchema.safeParse(body);
  if (response.status === 400 && rejected.success)
    throw new AccountSettingsError("INVALID_INPUT", rejected.data.message);
  throw unavailable();
}

const unavailable = () =>
  new AccountSettingsError("UNAVAILABLE", "Account settings are unavailable");
