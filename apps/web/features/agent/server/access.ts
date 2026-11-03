import "server-only";
import { AccountSettingsError } from "../../account/settings";
import type { AccountSettingsStore } from "../../account/server/settings";
import { SessionError, type Sessions } from "../../sessions/server/sessions";

/** The acting account's saved sessions and settings. */
export type AgentAccount = { sessions: Sessions; settings: Pick<AccountSettingsStore, "get"> };

export type RemoteControlDenial = {
  code: "UNAUTHENTICATED" | "REMOTE_CONTROL_DISABLED" | "NOT_FOUND";
  error: string;
};

/**
 * Whether the acting account may control `sessionId` remotely: it is signed in,
 * its saved Remote Control preference is on, and it owns the session. Knowing a
 * session ID grants nothing. Returns why not, or null when allowed; storage
 * failures reject.
 */
export async function authorizeRemoteControl(
  { sessions, settings }: AgentAccount,
  sessionId: string,
): Promise<RemoteControlDenial | null> {
  try {
    if (!(await settings.get()).remoteControl) {
      const error = "Remote control is turned off for this account";
      return { code: "REMOTE_CONTROL_DISABLED", error };
    }
    await sessions.authorize(sessionId);
    return null;
  } catch (error) {
    if (
      (error instanceof AccountSettingsError || error instanceof SessionError) &&
      error.code === "UNAUTHENTICATED"
    )
      return { code: "UNAUTHENTICATED", error: "Sign in to use remote control" };
    if (error instanceof SessionError && error.code === "NOT_FOUND")
      return { code: "NOT_FOUND", error: "Session not found" };
    throw error;
  }
}
