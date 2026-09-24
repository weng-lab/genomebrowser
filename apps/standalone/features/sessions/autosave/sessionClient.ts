import type { SaveSessionResult, SessionUpdate } from "../types";

/** Send an autosave write to `PUT /api/sessions/[sessionId]`. Throws when storage is down. */
export async function putSession({ id, ...body }: SessionUpdate): Promise<SaveSessionResult> {
  const json = JSON.stringify(body);
  const response = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: json,
    // Browsers limit outstanding keepalive bodies to 64 KiB.
    keepalive: new Blob([json]).size < 60_000,
  });
  if (response.status >= 500) throw new Error("Session storage is unavailable.");
  return response.json();
}
