"use client";

import { useCallback, useEffect, useState } from "react";
import { Client, ClientError, SessionNotActiveError, type SessionSnapshot } from "eve/client";

export type AgentThread =
  | { status: "loading" }
  | { status: "failed"; error: Error }
  | {
      status: "ready";
      /** The thread's conversation so far, or null when the next message starts it. */
      saved: SessionSnapshot | null;
      /** Give up a conversation Eve can no longer continue, and start the thread afresh. */
      replace(conversationId: string): Promise<void>;
    };

/**
 * Whether `error` means Eve can never continue the conversation, rather than a
 * passing failure: it is gone, expired, ended, or stranded by an Eve upgrade.
 */
export function isLostConversation(error: unknown) {
  // A session still starting is not lost; Eve says it may be retried.
  if (error instanceof SessionNotActiveError) return !error.retryable;
  return (
    ClientError.is(error) &&
    (error.status === 404 || error.code === "session_expired" || error.code === "session_stranded")
  );
}

const threadUrl = (sessionId: string) =>
  `/api/sessions/${encodeURIComponent(sessionId)}/agent-thread`;

async function release(sessionId: string, conversationId: string, signal: AbortSignal) {
  const url = `${threadUrl(sessionId)}?conversation=${encodeURIComponent(conversationId)}`;
  const response = await fetch(url, { method: "DELETE", signal });
  if (!response.ok) throw new Error("The agent conversation could not be restarted");
}

async function loadThread(sessionId: string, signal: AbortSignal): Promise<SessionSnapshot | null> {
  const response = await fetch(threadUrl(sessionId), { cache: "no-store", signal });
  if (!response.ok) throw new Error("The agent conversation could not be loaded");
  const { conversationId } = (await response.json()) as { conversationId: string | null };
  if (!conversationId) return null;
  const client = new Client({
    baseUrl: "",
    headers: { "x-genomebrowser-session-id": sessionId },
  });
  const conversation = client.sessions.attach(conversationId);
  try {
    // A conversation another tab just created can 404 briefly, so retry a little;
    // Eve's own reads would retry a missing one for most of a minute.
    const latest = conversation.stream({
      startIndex: -1,
      follow: false,
      signal,
      reconnect: { maxAttempts: 4, baseDelayMs: 250 },
    });
    for await (const _event of latest) break;
    const saved = await conversation.snapshot({ signal });
    if (!saved.events.some((event) => event.type === "session.ended")) return saved;
  } catch (error) {
    if (!isLostConversation(error)) throw error;
  }
  await release(sessionId, conversationId, signal);
  return null;
}

/**
 * Load `sessionId`'s agent thread while `signal` is open: the app names the
 * session's conversation, and Eve supplies what it holds so far. A conversation
 * Eve can no longer continue is replaced, so the next message starts the thread
 * afresh.
 */
export function useAgentThread(sessionId: string, signal: AbortSignal): AgentThread {
  const [thread, setThread] = useState<
    | { status: "loading" }
    | { status: "failed"; error: Error }
    | { status: "ready"; saved: SessionSnapshot | null }
  >({ status: "loading" });
  const [generation, setGeneration] = useState(0);

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
  }, [sessionId, signal, generation]);

  const replace = useCallback(
    async (conversationId: string) => {
      await release(sessionId, conversationId, signal);
      setGeneration((value) => value + 1);
    },
    [sessionId, signal],
  );

  return thread.status === "ready" ? { ...thread, replace } : thread;
}
