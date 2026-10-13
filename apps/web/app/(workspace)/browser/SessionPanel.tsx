"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { sessionListSchema } from "@weng-lab/browser-server/protocol";
import { useDeleteSession, useSessionId } from "../../../browser/BrowserServer";

export function SessionPanel() {
  const sessionId = useSessionId();
  const deleteSession = useDeleteSession();
  const router = useRouter();
  const listVersion = useRef(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ ids: string[]; status: "loading" | "ready" | "error" }>({
    ids: [],
    status: "loading",
  });

  useEffect(() => {
    let request: AbortController | undefined;
    async function refresh() {
      request?.abort();
      const version = ++listVersion.current;
      const abort = new AbortController();
      request = abort;
      try {
        const response = await fetch("/api/sessions", { signal: abort.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Session list failed");
        const ids = sessionListSchema.parse(await response.json());
        if (!abort.signal.aborted && version === listVersion.current)
          setSaved({ ids, status: "ready" });
      } catch {
        if (!abort.signal.aborted && version === listVersion.current)
          setSaved((previous) => ({ ...previous, status: "error" }));
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      request?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, []);

  async function handleDelete(id: string) {
    if (id === "local" || deleting) return;
    setDeleting(id);
    setDeleteError(null);
    try {
      await deleteSession(id);
      // Ignore list requests that started before deletion completed.
      ++listVersion.current;
      setSaved((previous) => ({
        ...previous,
        ids: previous.ids.filter((savedId) => savedId !== id),
      }));
      if (id === sessionId) router.replace("/browser/local");
    } catch {
      setDeleteError(`Could not delete ${id}. Try again.`);
    } finally {
      setDeleting(null);
    }
  }

  // Show the active session even before its first autosave creates a saved snapshot.
  const ids = [...new Set([...saved.ids, sessionId])].sort();
  return (
    <>
      <List component="nav" aria-label="Browser sessions" dense sx={{ px: 1 }}>
        {ids.map((id) => (
          <Box key={id} sx={{ display: "flex", alignItems: "center" }}>
            <ListItemButton
              component={Link}
              href={`/browser/${id}`}
              selected={id === sessionId}
              disabled={deleting !== null}
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
                disabled={deleting !== null}
                onClick={() => void handleDelete(id)}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
      </List>
      {deleteError && (
        <Typography role="alert" variant="body2" color="error" sx={{ p: 1.5 }}>
          {deleteError}
        </Typography>
      )}
      <Typography
        variant="body2"
        color={saved.status === "error" ? "error" : "text.secondary"}
        role={saved.status === "error" ? "alert" : "status"}
        sx={{ p: 1.5 }}
      >
        {saved.status === "loading"
          ? "Loading saved sessions..."
          : saved.status === "error"
            ? "Could not load saved sessions. Refresh this page to try again."
            : "Sessions save automatically."}
      </Typography>
    </>
  );
}
