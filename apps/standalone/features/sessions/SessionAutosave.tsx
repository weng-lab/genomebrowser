"use client";

import Alert from "@mui/material/Alert";
import type { BrowserStoreInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createSessionAutosave } from "./autosave/createAutosave";
import { putSession } from "./autosave/sessionClient";
import type { SavedSession } from "./types";

/** Saves store changes to the session in the background. Renders only save failures. */
export function SessionAutosave({
  browserStore,
  trackStore,
  session,
}: {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  session: Pick<SavedSession, "id" | "name" | "revision" | "snapshot">;
}) {
  const [autosave] = useState(() =>
    createSessionAutosave({ browserStore, trackStore, session, save: putSession }),
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
