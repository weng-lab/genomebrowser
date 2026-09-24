"use client";

import { useUser } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ActiveSession } from "./types";

type ActiveSessionState = {
  session: ActiveSession | null;
  setActive: (session: ActiveSession | null) => void;
  /** Clear the active session if it is the one with this ID, such as after deleting it. */
  clearIfActive: (id: string) => void;
};
const ActiveSessionContext = createContext<ActiveSessionState | null>(null);
const storageKey = (ownerId: string) => `genomebrowser:active-session:${ownerId}`;

function remember(ownerId: string, session: ActiveSession | null) {
  try {
    if (session) sessionStorage.setItem(storageKey(ownerId), JSON.stringify(session));
    else sessionStorage.removeItem(storageKey(ownerId));
  } catch {
    /* ActiveSessionState still works when browser storage is unavailable. */
  }
}

function recall(ownerId: string): ActiveSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(ownerId)) ?? "null");
    if (
      value?.ownerId === ownerId &&
      typeof value.id === "string" &&
      typeof value.name === "string"
    ) {
      return { ownerId, id: value.id, name: value.name };
    }
  } catch {
    /* Ignore missing or invalid tab metadata. */
  }
  return null;
}

export function ActiveSessionProvider({
  authConfigured,
  children,
}: {
  authConfigured: boolean;
  children: ReactNode;
}) {
  return authConfigured ? (
    <AccountActiveSession>{children}</AccountActiveSession>
  ) : (
    <OwnerActiveSession ownerId={null}>{children}</OwnerActiveSession>
  );
}

function AccountActiveSession({ children }: { children: ReactNode }) {
  const { user } = useUser();
  return <OwnerActiveSession ownerId={user?.id ?? null}>{children}</OwnerActiveSession>;
}

function OwnerActiveSession({
  ownerId,
  children,
}: {
  ownerId: string | null;
  children: ReactNode;
}) {
  const [sessions, setSessions] = useState<Record<string, ActiveSession | null>>({});
  const session = ownerId ? (sessions[ownerId] ?? null) : null;

  useEffect(() => {
    if (!ownerId) return;
    const saved = recall(ownerId);
    // A loaded session page takes priority over older tab metadata.
    setSessions((current) =>
      Object.hasOwn(current, ownerId) ? current : { ...current, [ownerId]: saved },
    );
  }, [ownerId]);

  const setActive = useCallback(
    (next: ActiveSession | null) => {
      const owner = next?.ownerId ?? ownerId;
      if (!owner) return;
      remember(owner, next);
      setSessions((current) => {
        const previous = current[owner];
        if (
          Object.hasOwn(current, owner) &&
          previous?.id === next?.id &&
          previous?.name === next?.name
        )
          return current;
        return { ...current, [owner]: next };
      });
    },
    [ownerId],
  );
  const clearIfActive = useCallback(
    (id: string) => {
      if (session?.id === id) setActive(null);
    },
    [session, setActive],
  );
  const value = useMemo(
    () => ({ session, setActive, clearIfActive }),
    [session, setActive, clearIfActive],
  );
  return <ActiveSessionContext value={value}>{children}</ActiveSessionContext>;
}

export function useActiveSession() {
  const state = useContext(ActiveSessionContext);
  if (!state) throw new Error("useActiveSession requires ActiveSessionProvider.");
  return state;
}

/** Register only sessions that the server has successfully loaded for this owner. */
export function RegisterActiveSession({ session }: { session: ActiveSession | null }) {
  const { setActive } = useActiveSession();
  const id = session?.id;
  const name = session?.name;
  const ownerId = session?.ownerId;
  useEffect(() => {
    setActive(id && name && ownerId ? { id, name, ownerId } : null);
  }, [id, name, ownerId, setActive]);
  return null;
}
