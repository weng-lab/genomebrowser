"use client";

import Add from "@mui/icons-material/Add";
import Search from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Session } from "../schema";
import type { SessionState } from "../session";
import { byRecent, formatSavedPeriod } from "../sessionDetails";
import { useSession } from "../SessionProvider";
import { NewSessionDialog, useCreateDisabled } from "./NewSessionDialog";
import { labelSx, SessionList, SessionListStatus } from "./SessionList";

/**
 * Every saved session, most recently saved first and grouped by when it was saved,
 * narrowed by a search of names and assemblies, for the browser's left panel. New session
 * creates one and opens it.
 */
export function SessionsPanel() {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const disabled = useCreateDisabled();
  const headingId = useId();
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
      <Box component="search" sx={barSx}>
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
        <Button
          variant="outlined"
          fullWidth
          startIcon={<Add />}
          disabled={disabled}
          onClick={() => setCreating(true)}
        >
          New session
        </Button>
      </Box>
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto", px: 1, pb: 1 }}>
        {groupBy(ids, periods).map(({ period, ids }, index) => (
          <Box component="section" key={period} aria-labelledby={`${headingId}-${index}`}>
            <Typography
              id={`${headingId}-${index}`}
              component="h3"
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
      <NewSessionDialog open={creating} onClose={() => setCreating(false)} />
    </Box>
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

/** The search field, with New session below it, above the list that scrolls. */
const barSx = { display: "flex", flexDirection: "column", gap: 1, p: 1.5, pb: 0.5 } as const;
