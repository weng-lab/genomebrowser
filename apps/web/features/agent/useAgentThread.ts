"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Client, ClientError, SessionNotActiveError, type SessionSnapshot } from "eve/client";

export type AgentThread =
  | { status: "loading" }
  /** The thread is rolling over: summarizing its conversation, then starting afresh. */
  | { status: "rolling-over" }
  | { status: "failed"; error: Error }
  | {
      status: "ready";
      /** The thread's conversation so far, or null when the next message starts it. */
      saved: SessionSnapshot | null;
      /** Whether the agent carries a summary of the session's earlier threads. */
      summarized: boolean;
      /**
       * End `conversationId` and start the thread afresh. With `summarize`, the
       * agent first writes a summary of it to carry forward. Failures show as the
       * thread's `failed` status; the promise always resolves.
       */
      rollOver(conversationId: string, options: { summarize: boolean }): Promise<void>;
    };

/**
 * Whether `error` means Eve can never continue the conversation, rather than a
 * passing failure: it is gone, expired, ended, or stranded by an Eve upgrade.
 */
export function isLostConversation(error: unknown) {
  if (error instanceof SessionNotActiveError) return true;
  return (
    ClientError.is(error) &&
    (error.status === 404 || error.code === "session_expired" || error.code === "session_stranded")
  );
}

const threadUrl = (sessionId: string) =>
  `/api/sessions/${encodeURIComponent(sessionId)}/agent-thread`;

const conversations = (sessionId: string) =>
  new Client({ baseUrl: "", headers: { "x-genomebrowser-session-id": sessionId } }).sessions;

const summarySchema = {
  type: "object",
  properties: {
    sessionHistory: {
      type: "string",
      description:
        "A high-level account of everything in this session before this conversation, merged with the summary you were given. At most 2,500 words; compress or drop the oldest details first.",
    },
    latestThread: {
      type: "string",
      description:
        "A somewhat more detailed account of this conversation: what the user asked for, what you changed in the browser, and anything left unfinished.",
    },
  },
  required: ["sessionHistory", "latestThread"],
  additionalProperties: false,
} as const;

/**
 * Ask the conversation's agent to summarize it for the next thread. The request
 * is marked, so it does not count as activity in the thread. Stopping early
 * cancels the summary turn.
 */
async function summarize(sessionId: string, conversationId: string, signal: AbortSignal) {
  const conversation = new Client({
    baseUrl: "",
    headers: { "x-genomebrowser-session-id": sessionId, "x-genomebrowser-summary": "1" },
  }).sessions.attach(conversationId);
  const delivery = await conversation.send<{ sessionHistory: string; latestThread: string }>(
    "This conversation is ending. Without calling any tools, summarize it for the next conversation in this session. The browser may change before then, so describe what happened rather than the browser's current state. Leave out the user's standing preferences, which are kept separately, and write plain prose whatever style they ask for.",
    { outputSchema: summarySchema, signal },
  );
  const result = await delivery
    .result({ signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]) })
    .catch(async (error: unknown) => {
      await conversation.cancel({ signal: AbortSignal.timeout(5_000) }).catch(() => {});
      throw error;
    });
  const { data } = result;
  if (!data) return undefined;
  return `Session history:\n${data.sessionHistory.trim()}\n\nLatest conversation:\n${data.latestThread.trim()}`;
}

/** End `conversationId` as the session's thread, keeping `summary` when given. */
async function endThread(
  sessionId: string,
  conversationId: string,
  summary: string | undefined,
  signal: AbortSignal,
) {
  const response = await fetch(`${threadUrl(sessionId)}/rollover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, summary }),
    signal,
  });
  // 409: another tab already rolled it over.
  if (!response.ok && response.status !== 409)
    throw new Error("The agent conversation could not be restarted");
}

type Loaded =
  | { status: "ready"; saved: SessionSnapshot | null; summarized: boolean }
  | { status: "idle"; conversationId: string };

async function loadThread(sessionId: string, signal: AbortSignal): Promise<Loaded> {
  const response = await fetch(threadUrl(sessionId), { cache: "no-store", signal });
  if (!response.ok) throw new Error("The agent conversation could not be loaded");
  const { conversationId, idle, summarized } = (await response.json()) as {
    conversationId: string | null;
    idle: boolean;
    summarized: boolean;
  };
  if (!conversationId) return { status: "ready", saved: null, summarized };
  const conversation = conversations(sessionId).attach(conversationId);
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
    if (!saved.events.some((event) => event.type === "session.ended")) {
      // A turn still running or waiting on the user is never cut short by a rollover.
      const started = saved.events.filter((event) => event.type === "turn.started").length;
      const settled = saved.events.filter((event) => event.type === "turn.settled").length;
      const rollable = idle && started === settled;
      return rollable ? { status: "idle", conversationId } : { status: "ready", saved, summarized };
    }
  } catch (error) {
    if (!isLostConversation(error)) throw error;
  }
  // Eve can no longer continue it, so the next message starts the thread afresh.
  await endThread(sessionId, conversationId, undefined, signal);
  return { status: "ready", saved: null, summarized };
}

/**
 * Load `sessionId`'s agent thread while `signal` is open: the app names the
 * session's conversation, and Eve supplies what it holds so far. A conversation
 * Eve can no longer continue is replaced. One idle for hours rolls over once
 * the session's tab is `connected`, since the agent summarizes it first.
 */
export function useAgentThread(
  sessionId: string,
  signal: AbortSignal,
  connected: boolean,
): AgentThread {
  const [loaded, setLoaded] = useState<
    Loaded | { status: "loading" | "rolling-over" } | { status: "failed"; error: Error }
  >({ status: "loading" });
  const [generation, setGeneration] = useState(0);

  const fail = useCallback((error: unknown) => {
    const failure = error instanceof Error ? error : new Error("The agent conversation failed");
    setLoaded({ status: "failed", error: failure });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const aborted = AbortSignal.any([signal, controller.signal]);
    setLoaded({ status: "loading" });
    loadThread(sessionId, aborted)
      .then((thread) => {
        if (!aborted.aborted) setLoaded(thread);
      })
      .catch((error: unknown) => {
        if (!aborted.aborted) fail(error);
      });
    return () => controller.abort();
  }, [sessionId, signal, generation, fail]);

  // Rollovers in progress, by conversation, so asking again, as React's second
  // effect run in development does, joins the first instead of starting another.
  const rolling = useRef(new Map<string, Promise<void>>());

  const rollOver = useCallback(
    (conversationId: string, { summarize: withSummary }: { summarize: boolean }) => {
      const running = rolling.current.get(conversationId);
      if (running) return running;
      const run = (async () => {
        setLoaded({ status: "rolling-over" });
        try {
          // A summary that cannot be written leaves the previous one in place.
          const summary = withSummary
            ? await summarize(sessionId, conversationId, signal).catch((error: unknown) => {
                if (signal.aborted) throw error;
                console.error("Could not summarize the agent conversation", error);
                return undefined;
              })
            : undefined;
          await conversations(sessionId)
            .attach(conversationId)
            .end({ signal })
            .catch(() => {});
          await endThread(sessionId, conversationId, summary, signal);
          setGeneration((value) => value + 1);
        } catch (error) {
          if (!signal.aborted) fail(error);
        } finally {
          rolling.current.delete(conversationId);
        }
      })();
      rolling.current.set(conversationId, run);
      return run;
    },
    [sessionId, signal, fail],
  );

  // An idle thread rolls over once the tab holds the session, so the summary turn can run.
  const idle = loaded.status === "idle" ? loaded.conversationId : undefined;
  useEffect(() => {
    if (!idle || !connected) return;
    // oxlint-disable-next-line typescript/no-floating-promises -- rollOver reports its own failures and always resolves.
    void rollOver(idle, { summarize: true });
  }, [idle, connected, rollOver]);

  if (loaded.status === "ready") return { ...loaded, rollOver };
  if (loaded.status === "idle") return { status: "rolling-over" };
  return loaded;
}
