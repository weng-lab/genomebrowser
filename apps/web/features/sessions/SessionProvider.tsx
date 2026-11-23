"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useParams, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStores } from "../assemblies/assemblies";
import { sessionIdSchema } from "./schema";
import { createSession, type SessionState, type SessionStore } from "./session";
import { createSessionTransport } from "./transport";

const SessionContext = createContext<SessionStore | null>(null);
// Outside a SessionProvider there is no session switch to hold back.
const HoldContext = createContext<(reason: string | undefined) => void>(() => {});

/**
 * Owns saved sessions and the open session for as long as the workspace stays
 * mounted for one account, across its pages. A session URL opens that session,
 * whether it was typed, linked, or reached through history. While the open
 * session is held, the user confirms before another one replaces it.
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
  const [hold, setHold] = useState<string>();
  const active = useStore(session.store, (state) => state.active?.id);
  // The session the user chose to switch to despite the hold.
  const [confirmed, setConfirmed] = useState<string>();
  const confirming = Boolean(
    hold && active && requested && requested !== active && requested !== confirmed,
  );

  useEffect(() => session.start(), [session]);
  useEffect(() => {
    if (!requested || confirming) return;
    // oxlint-disable-next-line typescript/no-floating-promises -- Session operations observe Effect failures and always resolve.
    void session.store.getState().open(requested);
  }, [session, requested, confirming]);

  return (
    <SessionContext value={session.store}>
      <HoldContext value={setHold}>{children}</HoldContext>
      <Dialog open={confirming} onClose={() => router.replace(`/browser/${active}`)} maxWidth="xs">
        <DialogTitle>Switch sessions?</DialogTitle>
        <DialogContent>
          <DialogContentText>{hold}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => router.replace(`/browser/${active}`)}>Stay</Button>
          <Button variant="contained" onClick={() => setConfirmed(requested)}>
            Switch
          </Button>
        </DialogActions>
      </Dialog>
    </SessionContext>
  );
}

/**
 * Ask before another session replaces the open one, for as long as `reason` is
 * set. `reason` tells the user what switching interrupts.
 */
export function useHoldSession(reason: string | undefined) {
  const setHold = useContext(HoldContext);
  useEffect(() => {
    if (!reason) return;
    setHold(reason);
    return () => setHold(undefined);
  }, [setHold, reason]);
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
