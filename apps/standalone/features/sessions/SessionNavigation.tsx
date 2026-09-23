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
import type { SavedSession } from "./types";

type Session = Pick<SavedSession, "id" | "name" | "ownerId">;
type Navigation = {
  session: Session | null;
  select: (session: Session | null) => void;
  forget: (id: string) => void;
};
const SessionNavigationContext = createContext<Navigation | null>(null);
const storageKey = (ownerId: string) => `genomebrowser:active-session:${ownerId}`;

function remember(ownerId: string, session: Session | null) {
  try {
    if (session) sessionStorage.setItem(storageKey(ownerId), JSON.stringify(session));
    else sessionStorage.removeItem(storageKey(ownerId));
  } catch {
    /* Navigation still works when browser storage is unavailable. */
  }
}

function recall(ownerId: string): Session | null {
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

export function SessionNavigationProvider({
  authConfigured,
  children,
}: {
  authConfigured: boolean;
  children: ReactNode;
}) {
  return authConfigured ? (
    <AuthenticatedNavigation>{children}</AuthenticatedNavigation>
  ) : (
    <NavigationProvider ownerId={null}>{children}</NavigationProvider>
  );
}

function AuthenticatedNavigation({ children }: { children: ReactNode }) {
  const { user } = useUser();
  return <NavigationProvider ownerId={user?.id ?? null}>{children}</NavigationProvider>;
}

function NavigationProvider({
  ownerId,
  children,
}: {
  ownerId: string | null;
  children: ReactNode;
}) {
  const [sessions, setSessions] = useState<Record<string, Session | null>>({});
  const session = ownerId ? (sessions[ownerId] ?? null) : null;

  useEffect(() => {
    if (!ownerId) return;
    const saved = recall(ownerId);
    // A loaded session page takes priority over older tab metadata.
    setSessions((current) =>
      Object.hasOwn(current, ownerId) ? current : { ...current, [ownerId]: saved },
    );
  }, [ownerId]);

  const select = useCallback(
    (next: Session | null) => {
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
  const forget = useCallback(
    (id: string) => {
      if (session?.id === id) select(null);
    },
    [session, select],
  );
  const value = useMemo(() => ({ session, select, forget }), [session, select, forget]);
  return <SessionNavigationContext value={value}>{children}</SessionNavigationContext>;
}

export function useSessionNavigation() {
  const navigation = useContext(SessionNavigationContext);
  if (!navigation) throw new Error("Session navigation requires SessionNavigationProvider.");
  return navigation;
}

/** Register only sessions that the server has successfully loaded for this owner. */
export function SessionNavigation({ session }: { session: Session | null }) {
  const { select } = useSessionNavigation();
  const id = session?.id;
  const name = session?.name;
  const ownerId = session?.ownerId;
  useEffect(() => {
    select(id && name && ownerId ? { id, name, ownerId } : null);
  }, [id, name, ownerId, select]);
  return null;
}
