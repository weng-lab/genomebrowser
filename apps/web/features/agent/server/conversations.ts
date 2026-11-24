import "server-only";
import { agentAppOrigin, agentDeploymentHeaders } from "./deployment";

/**
 * End `conversationId` in Eve for good, as the signed-in user of `request`
 * acting on browser session `sessionId`. Eve authorizes it like that user's own
 * Stop, so the conversation must still be the session's thread. Resolves once
 * Eve has accepted the end or no longer holds the conversation active, and
 * rejects when Eve refuses or cannot be reached.
 */
export async function endConversation(request: Request, sessionId: string, conversationId: string) {
  const headers = new Headers(await agentDeploymentHeaders());
  for (const name of ["cookie", "authorization"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-genomebrowser-session-id", sessionId);
  headers.set("content-type", "application/json");
  // The app's own origin serves Eve's routes, as it does for the browser.
  const url = new URL(
    `/eve/v1/session/${encodeURIComponent(conversationId)}/end`,
    agentAppOrigin(),
  );
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason: "The browser session was deleted" }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.ok) return;
  if (response.status === 409) {
    const failure = (await response.json().catch(() => null)) as { code?: unknown } | null;
    // Already ended, or never known to Eve: nothing is left to end.
    if (failure?.code === "session_not_active") return;
  }
  throw new Error(`Eve could not end the agent conversation (${response.status})`);
}
