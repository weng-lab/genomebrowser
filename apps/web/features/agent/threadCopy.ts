import { transcriptOf } from "eve/client";
import { readConversation } from "./useAgentThread";

/** Room for the copied conversation within the copy's starting summary. */
const maxTranscript = 20_000;

/** `sourceId`'s current conversation in words, newest kept when it is long, or undefined. */
async function transcript(sourceId: string, signal: AbortSignal) {
  const response = await fetch(`/api/sessions/${encodeURIComponent(sourceId)}/agent-thread`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("The agent conversation could not be read");
  const { conversationId } = (await response.json()) as { conversationId: string | null };
  if (!conversationId) return undefined;
  // A conversation Eve no longer has leaves only the source's stored summary to copy.
  const saved = await readConversation(sourceId, conversationId, signal);
  if (!saved) return undefined;
  const { events } = saved;
  const lines = transcriptOf(events, { maxMessages: 80 }).messages.map(
    ({ role, text }) => `${role === "user" ? "User" : "Agent"}: ${text.trim()}`,
  );
  let text = lines.join("\n\n");
  if (text.length > maxTranscript) text = `…${text.slice(-maxTranscript)}`;
  return text || undefined;
}

/**
 * Bring `sourceId`'s agent conversation into its new copy `copyId`: the copy's
 * thread starts with the source's summary and its current conversation in
 * words. The source's own thread is unchanged.
 */
export async function copyAgentThread(sourceId: string, copyId: string, signal: AbortSignal) {
  const response = await fetch(`/api/sessions/${encodeURIComponent(copyId)}/agent-thread/copy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: sourceId, transcript: await transcript(sourceId, signal) }),
    signal,
  });
  if (!response.ok) throw new Error("The agent's conversation could not be copied");
}
