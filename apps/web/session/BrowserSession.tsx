"use client";

import { createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { createContext, useContext, useState, type ReactNode } from "react";

export type BrowserSession = {
  useBrowserStore: ReturnType<typeof createBrowserStore>;
  useTrackStore: ReturnType<typeof createTrackStore>;
};

const BrowserSessionContext = createContext<BrowserSession | null>(null);

/** Owns the active browser state for the entire workspace mount, across page changes. */
export function BrowserSessionProvider({ children }: { children: ReactNode }) {
  const [session] = useState<BrowserSession>(() => ({
    useBrowserStore: createBrowserStore({
      assembly: hg38,
      region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
    }),
    useTrackStore: createTrackStore({
      modules: [rulerModule],
      tracks: [rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} })],
    }),
  }));

  return <BrowserSessionContext value={session}>{children}</BrowserSessionContext>;
}

/** Read the active browser stores from a shared workspace page. */
export function useBrowserSession(): BrowserSession {
  const session = useContext(BrowserSessionContext);
  if (!session) throw new Error("useBrowserSession must be used within BrowserSessionProvider");
  return session;
}
