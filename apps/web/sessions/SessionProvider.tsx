"use client";

import { useParams, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStores } from "../assemblies/assemblies";
import { sessionIdSchema } from "./schema";
import { createSession, type SessionState, type SessionStore } from "./session";
import { createSessionTransport } from "./transport";

const SessionContext = createContext<SessionStore | null>(null);

/**
 * Owns saved sessions and the open session for as long as the workspace stays
 * mounted for one account, across its pages. A session URL opens that session,
 * whether it was typed, linked, or reached through history.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session] = useState(() =>
    createSession({
      transport: createSessionTransport(),
      createStores,
      navigation: {
        show(id) {
          // Pages without a session, such as Settings, keep their URL.
          const { pathname } = window.location;
          if (pathname !== "/browser" && !pathname.startsWith("/browser/")) return;
          const href = id ? `/browser/${id}` : "/browser";
          if (pathname !== href) router.replace(href);
        },
      },
    }),
  );
  const { sessionId } = useParams<{ sessionId?: string }>();
  const requested = sessionIdSchema.safeParse(sessionId).success ? sessionId : undefined;

  useEffect(() => session.start(), [session]);
  useEffect(() => {
    if (requested) void session.store.getState().open(requested);
  }, [session, requested]);

  return <SessionContext value={session.store}>{children}</SessionContext>;
}

function useSessionStore() {
  const store = useContext(SessionContext);
  if (!store) throw new Error("useSession must be used within SessionProvider");
  return store;
}

/** Select session state or operations. Select single values so unrelated changes do not render. */
export function useSession<T>(selector: (state: SessionState) => T): T {
  return useStore(useSessionStore(), selector);
}

/** Read the current session state outside rendering, such as when a command arrives. */
export function useSessionState(): () => SessionState {
  return useSessionStore().getState;
}
