"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useParams, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
 * session is held, the user confirms before another one replaces it, however
 * that was requested: a session URL, a new session, or a copy.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Why the open session should not be replaced without asking, while something holds it.
  const hold = useRef<string | undefined>(undefined);
  const setHold = useCallback((reason: string | undefined) => {
    hold.current = reason;
  }, []);
  // The newest request to replace a held session, waiting for the user's choice.
  const waiting = useRef<((replace: boolean) => void) | undefined>(undefined);
  const [prompt, setPrompt] = useState<string>();
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
      confirmReplace() {
        const reason = hold.current;
        // The session store drops an older request once a newer one arrives, asked or not.
        waiting.current?.(false);
        waiting.current = undefined;
        if (!reason) {
          setPrompt(undefined);
          return undefined;
        }
        setPrompt(reason);
        return new Promise<boolean>((resolve) => {
          waiting.current = resolve;
        });
      },
    }),
  );
  const { sessionId } = useParams<{ sessionId?: string }>();
  const requested = sessionIdSchema.safeParse(sessionId).success ? sessionId : undefined;

  useEffect(() => session.start(), [session]);
  useEffect(() => {
    if (!requested) return;
    // oxlint-disable-next-line typescript/no-floating-promises -- Session operations observe Effect failures and always resolve.
    void session.store.getState().open(requested);
  }, [session, requested]);

  /** Give the waiting request the user's choice. Told to stay, it restores the URL. */
  function answer(replace: boolean) {
    setPrompt(undefined);
    const resolve = waiting.current;
    waiting.current = undefined;
    resolve?.(replace);
  }
  const stay = () => answer(false);

  return (
    <SessionContext value={session.store}>
      <HoldContext value={setHold}>{children}</HoldContext>
      <Dialog open={prompt !== undefined} onClose={stay} maxWidth="xs">
        <DialogTitle>Switch sessions?</DialogTitle>
        <DialogContent>
          <DialogContentText>{prompt}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={stay}>Stay</Button>
          <Button variant="contained" onClick={() => answer(true)}>
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
