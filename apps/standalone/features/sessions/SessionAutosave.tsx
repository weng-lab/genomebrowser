"use client";

import Alert from "@mui/material/Alert";
import type { BrowserStoreInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createSessionAutosave, persistSession } from "./autosave";
import { captureSessionSnapshot } from "./snapshot";
import type { SavedSession, SessionSnapshot } from "./types";

type Props = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  initialSession: Pick<SavedSession, "id" | "name" | "revision">;
  initialSnapshot?: SessionSnapshot;
};

export function SessionAutosave({
  browserStore,
  trackStore,
  initialSession,
  initialSnapshot,
}: Props) {
  const [autosave] = useState(() =>
    createSessionAutosave({
      browserStore,
      trackStore,
      initialSession,
      initialSnapshot: initialSnapshot ?? captureSessionSnapshot(browserStore, trackStore),
      save: persistSession,
    }),
  );
  const status = useSyncExternalStore(autosave.subscribe, autosave.getStatus, autosave.getStatus);

  useEffect(() => {
    const disconnect = autosave.connect();
    const flush = () => {
      void autosave.flush();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("online", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      disconnect();
    };
  }, [autosave]);

  return status.phase === "error" ? (
    <Alert severity="error" sx={{ mb: 2 }}>
      {status.message}
    </Alert>
  ) : null;
}
