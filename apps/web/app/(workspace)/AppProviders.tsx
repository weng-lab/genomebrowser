"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { sessionIdSchema } from "@weng-lab/browser-server/protocol";
import { BrowserServer } from "../../browser/BrowserServer";
import { WorkspaceSkeleton } from "../../components/workspace/WorkspaceSkeleton";

// Browser stores initialize browser-only rendering resources. The provider stays mounted
// in the shared layout while Next swaps the page supplied as children.
const BrowserSessionProvider = dynamic(
  () => import("../../browser/BrowserSession").then((module) => module.BrowserSessionProvider),
  { ssr: false, loading: () => <WorkspaceSkeleton /> },
);

/** Opened until there is a session picker, and when no session has been viewed yet. */
const defaultSessionId = "local";

export function AppProviders({ children }: { children: ReactNode }) {
  const sessionId = useCurrentSessionId();
  // A different session gets fresh stores instead of inheriting the previous session's state.
  return (
    <BrowserSessionProvider key={sessionId}>
      <BrowserServer endpoint="/api" sessionId={sessionId}>
        {children}
      </BrowserServer>
    </BrowserSessionProvider>
  );
}

/** The session in the URL, or the last one viewed while on pages without one, such as Settings. */
function useCurrentSessionId() {
  const params = useParams<{ sessionId?: string }>();
  // An invalid ID renders the not-found page; keep the current session instead of opening it.
  const sessionId = sessionIdSchema.safeParse(params.sessionId).success
    ? params.sessionId
    : undefined;
  const [lastSessionId, setLastSessionId] = useState(sessionId ?? defaultSessionId);
  if (sessionId && sessionId !== lastSessionId) setLastSessionId(sessionId);
  return sessionId ?? lastSessionId;
}
