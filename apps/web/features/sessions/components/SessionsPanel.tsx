"use client";

import Add from "@mui/icons-material/Add";
import Search from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Session } from "../schema";
import type { SessionState } from "../session";
import { byRecent, formatSavedPeriod } from "../sessionDetails";
import { useSession } from "../SessionProvider";
import { DeleteAllButton } from "../../../shared/ui/DeleteAllButton";
import { SectionHeader } from "../../../shared/ui/SectionHeader";
import { NewSessionForm } from "./NewSessionForm";
import { labelSx, SessionList, SessionListStatus } from "./SessionList";

type SessionsPanelProps = {
  /** Whether the New session form is open below the heading. */
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
};

/**
 * Every saved session, most recently saved first and grouped by when it was saved,
 * narrowed by a search of names and assemblies, for the browser's left panel. The heading's
 * New session opens a form below it that creates a session and opens it. Delete all sessions,
 * at the foot, deletes every one after asking.
 */
export function SessionsPanel({ creating, onCreatingChange }: SessionsPanelProps) {
  const [query, setQuery] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);
  const formId = useId();
  const headingId = useId();
  // Returns focus to the heading's button, which would otherwise be lost with the form.
  const closeForm = () => {
    addButton.current?.focus();
    onCreatingChange(false);
  };
  // Groups read relative to when the panel opened.
  const [now] = useState(() => new Date());
  const search = query.trim().toLowerCase();
  const found = ({ sessions }: SessionState) =>
    sessions.filter((session) => matches(session, search)).toSorted(byRecent);
  // Parallel lists of strings, so the panel renders only when one of them changes.
  const ids = useSession(useShallow((state) => found(state).map(({ id }) => id)));
  const periods = useSession(
    useShallow((state) => found(state).map(({ updatedAt }) => formatSavedPeriod(updatedAt, now))),
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
      <Box component="search" sx={{ px: 1.5, pt: 1.5 }}>
        <TextField
          type="search"
          size="small"
          fullWidth
          placeholder="Search sessions"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          slotProps={{
            htmlInput: { "aria-label": "Search sessions" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <Box sx={{ px: 1.5, pt: 1, pb: 1 }}>
        <SectionHeader
          title="Sessions"
          count={ids.length || undefined}
          actions={[
            {
              label: "New session",
              icon: <Add />,
              onClick: () => onCreatingChange(!creating),
              expanded: creating,
              controls: formId,
              ref: addButton,
            },
          ]}
        />
      </Box>
      {creating && (
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <NewSessionForm id={formId} onClose={closeForm} />
        </Box>
      )}
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto", px: 1, pb: 1 }}>
        {groupBy(ids, periods).map(({ period, ids }, index) => (
          <Box component="section" key={period} aria-labelledby={`${headingId}-${index}`}>
            <Typography
              id={`${headingId}-${index}`}
              component="h4"
              variant="caption"
              display="block"
              color="text.secondary"
              sx={labelSx}
            >
              {period}
            </Typography>
            {/* The heading says when they were saved, so rows leave it out. */}
            <SessionList ids={ids} aria-labelledby={`${headingId}-${index}`} />
          </Box>
        ))}
        <SessionListStatus
          count={ids.length}
          empty={search ? `No sessions match “${query.trim()}”.` : "No saved sessions yet."}
        />
      </Box>
      <Box sx={{ p: 1, pb: 1.5 }}>
        {/* Focus leaves the button, which deleting disables. */}
        <DeleteAllSessions onDelete={() => addButton.current?.focus()} />
      </Box>
    </Box>
  );
}

/**
 * Deletes every saved session, whatever the search shows, after asking. While a session is
 * open and others are saved, the confirmation also offers to delete all but the open one.
 * Disabled while there are none, or while sessions are unavailable or another operation runs.
 */
function DeleteAllSessions({ onDelete }: { onDelete: () => void }) {
  const disabled = useSession(
    (session) =>
      session.sessions.length === 0 || session.status !== "ready" || session.pending !== undefined,
  );
  const hasActive = useSession(({ active }) => active !== undefined);
  const hasOthers = useSession(({ active, sessions }) =>
    active ? sessions.some(({ id }) => id !== active.id) : false,
  );
  const removeAll = useSession((session) => session.removeAll);
  return (
    <DeleteAllButton
      label="Delete all sessions"
      disabled={disabled}
      confirmTitle="Delete all sessions?"
      confirmText={
        hasActive
          ? "Every saved session will be deleted, including the one open in the browser."
          : "Every saved session will be deleted."
      }
      confirmLabel="Delete all"
      onDelete={() => {
        onDelete();
        // oxlint-disable-next-line typescript/no-floating-promises -- Session operations observe Effect failures and always resolve.
        void removeAll();
      }}
      confirmAlternative={
        hasOthers
          ? {
              label: "Delete all but current",
              onConfirm: () => {
                onDelete();
                // oxlint-disable-next-line typescript/no-floating-promises -- Session operations observe Effect failures and always resolve.
                void removeAll({ keepActive: true });
              },
            }
          : undefined
      }
    />
  );
}

/** Runs of `ids` that share a period, in order. Sorted by save time, each period is one run. */
function groupBy(ids: readonly string[], periods: readonly string[]) {
  const groups: { period: string; ids: string[] }[] = [];
  ids.forEach((id, index) => {
    const period = periods[index];
    const last = groups.at(-1);
    if (last?.period === period) last.ids.push(id);
    else groups.push({ period, ids: [id] });
  });
  return groups;
}

const matches = ({ name, assembly }: Session, search: string) =>
  name.toLowerCase().includes(search) || assembly.toLowerCase().includes(search);
