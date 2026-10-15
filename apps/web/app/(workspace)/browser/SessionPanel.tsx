"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { usePanelState } from "../../../components/workspace/panels/panelState";
import { sessionListSchema } from "@weng-lab/browser-server/protocol";
import { useDeleteSession, useFlushSession, useSessionId } from "../../../browser/BrowserServer";

async function fetchSessions(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Session list failed");
  return sessionListSchema.parse(await response.json());
}

export function SessionPanel() {
  const sessionId = useSessionId();
  const deleteSession = useDeleteSession();
  const router = useRouter();
  const flushSession = useFlushSession();
  const [switching, setSwitching] = useState(false);
  const switchPending = useRef(false);
  const selectionGeneration = useRef(0);
  useEffect(
    () => () => {
      // Saving outlives this panel when the user visits another workspace page.
      selectionGeneration.current += 1;
    },
    [],
  );
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const {
    data: savedIds = [],
    error,
    isLoading,
    mutate,
  } = useSWR("/api/sessions", fetchSessions, {
    revalidateOnMount: true,
  });

  const open = usePanelState((state) => state.leftOpen);
  const wasOpen = useRef(open);
  useEffect(() => {
    // Closed workspace panels remain mounted, so mount revalidation cannot refresh reopening.
    if (open && !wasOpen.current) void mutate();
    wasOpen.current = open;
  }, [open, mutate]);

  async function openSession(id: string) {
    if (id === sessionId || deleting || switchPending.current) return;
    const generation = selectionGeneration.current;
    switchPending.current = true;
    setSwitching(true);
    setSwitchError(null);
    try {
      await flushSession();
      if (generation === selectionGeneration.current) router.replace(`/browser/${id}`);
    } catch {
      if (generation === selectionGeneration.current)
        setSwitchError(
          "Could not save this session. Stay here and try selecting the session again.",
        );
    } finally {
      if (generation === selectionGeneration.current) {
        switchPending.current = false;
        setSwitching(false);
      }
    }
  }

  async function handleDelete(id: string) {
    if (id === "local" || deleting || switchPending.current) return;
    setDeleting(id);
    setDeleteError(null);
    try {
      await deleteSession(id);
      // Updating the cache also invalidates list reads started before deletion completed.
      void mutate((ids) => (ids ?? []).filter((savedId) => savedId !== id), { revalidate: false });
      if (id === sessionId) router.replace("/browser/local");
    } catch {
      setDeleteError(`Could not delete ${id}. Try again.`);
    } finally {
      setDeleting(null);
    }
  }

  // Show the active session even before its first autosave creates a saved snapshot.
  const ids = [...new Set([...savedIds, sessionId])].sort();
  return (
    <>
      <List
        component="nav"
        aria-label="Browser sessions"
        dense
        sx={{ px: 1, flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        {ids.map((id) => (
          <Box key={id} sx={{ display: "flex", alignItems: "center" }}>
            <ListItemButton
              component={Link}
              href={`/browser/${id}`}
              onNavigate={(event: { preventDefault(): void }) => {
                event.preventDefault();
                void openSession(id);
              }}
              selected={id === sessionId}
              disabled={deleting !== null || switching}
              aria-current={id === sessionId ? "page" : undefined}
              sx={{ borderRadius: 1, flex: 1, minWidth: 0 }}
            >
              <ListItemText
                primary={id}
                slotProps={{ primary: { sx: { overflowWrap: "anywhere" } } }}
              />
            </ListItemButton>
            {id !== "local" && (
              <IconButton
                aria-label={`Delete session ${id}`}
                title={`Delete session ${id}`}
                size="small"
                disabled={deleting !== null || switching}
                onClick={() => void handleDelete(id)}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
      </List>
      {switchError && (
        <Typography role="alert" variant="body2" color="error" sx={{ p: 1.5, flexShrink: 0 }}>
          {switchError}
        </Typography>
      )}
      {deleteError && (
        <Typography role="alert" variant="body2" color="error" sx={{ p: 1.5, flexShrink: 0 }}>
          {deleteError}
        </Typography>
      )}
      <Typography
        variant="body2"
        color={error ? "error" : "text.secondary"}
        role={error ? "alert" : "status"}
        sx={{ p: 1.5, flexShrink: 0 }}
      >
        {error
          ? "Could not load saved sessions. Refresh this page to try again."
          : isLoading
            ? "Loading saved sessions..."
            : "Sessions save automatically."}
      </Typography>
    </>
  );
}
