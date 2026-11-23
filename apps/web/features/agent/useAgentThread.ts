"use client";

import { useEffect, useState } from "react";
import { Client, ClientError, type SessionSnapshot } from "eve/client";

export type AgentThread =
  | { status: "loading" }
  | { status: "failed"; error: Error }
  /** `saved` is the thread's conversation so far, or null when the next message starts it. */
  | { status: "ready"; saved: SessionSnapshot | null };

/** Whether Eve answered that it no longer has the conversation, rather than failing in passing. */
function isLost(error: unknown) {
  return (
    ClientError.is(error) &&
    (error.status === 404 || error.code === "session_expired" || error.code === "session_stranded")
  );
}

async function loadThread(sessionId: string, signal: AbortSignal): Promise<SessionSnapshot | null> {
  const url = `/api/sessions/${encodeURIComponent(sessionId)}/agent-thread`;
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error("The agent conversation could not be loaded");
  const { conversationId } = (await response.json()) as { conversationId: string | null };
  if (!conversationId) return null;
  const client = new Client({
    baseUrl: "",
    headers: { "x-genomebrowser-session-id": sessionId },
  });
  const conversation = client.sessions.attach(conversationId);
  try {
    // Eve's reads retry 404 while a new session becomes visible, so check the latest
    // line once without that retry before reading the conversation.
    const latest = conversation.stream({
      startIndex: -1,
      follow: false,
      signal,
      reconnect: { retryableStatuses: [409, 425, 500, 502, 503, 504] },
    });
    for await (const _event of latest) break;
    return await conversation.snapshot({ signal });
  } catch (error) {
    if (!isLost(error)) throw error;
  }
  // Eve no longer has the conversation, for example after it expired, so the next
  // message starts a new thread.
  const released = await fetch(`${url}?conversation=${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
    signal,
  });
  if (!released.ok) throw new Error("The expired agent conversation could not be replaced");
  return null;
}

/**
 * Load `sessionId`'s agent thread while `signal` is open: the app names the
 * session's conversation, and Eve supplies what it holds so far.
 */
export function useAgentThread(sessionId: string, signal: AbortSignal): AgentThread {
  const [thread, setThread] = useState<AgentThread>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const aborted = AbortSignal.any([signal, controller.signal]);
    setThread({ status: "loading" });
    loadThread(sessionId, aborted)
      .then((saved) => {
        if (!aborted.aborted) setThread({ status: "ready", saved });
      })
      .catch((error: unknown) => {
        if (aborted.aborted) return;
        const failure = error instanceof Error ? error : new Error("The agent conversation failed");
        setThread({ status: "failed", error: failure });
      });
    return () => controller.abort();
  }, [sessionId, signal]);

  return thread;
}
