"use client";

import Add from "@mui/icons-material/Add";
import Search from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
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
 * narrowed by a search of names and assemblies. New session creates one and opens it
 * in the browser.
 */
export function SessionsView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const disabled = useCreateDisabled();
  const headingId = useId();
  // Groups read relative to when the page opened.
  const [now] = useState(() => new Date());
  const search = query.trim().toLowerCase();
  const found = ({ sessions }: SessionState) =>
    sessions.filter((session) => matches(session, search)).toSorted(byRecent);
  // Parallel lists of strings, so the page renders only when one of them changes.
  const ids = useSession(useShallow((state) => found(state).map(({ id }) => id)));
  const periods = useSession(
    useShallow((state) => found(state).map(({ updatedAt }) => formatSavedPeriod(updatedAt, now))),
  );

  return (
    <Box sx={pageSx}>
      <Box component="search" sx={barSx}>
        <TextField
          type="search"
          size="small"
          placeholder="Search sessions"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ flexGrow: 1 }}
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
          variant="contained"
          startIcon={<Add />}
          disabled={disabled}
          onClick={() => setCreating(true)}
          sx={{ flexShrink: 0 }}
        >
          New session
        </Button>
      </Box>
      {groupBy(ids, periods).map(({ period, ids }, index) => (
        <Box component="section" key={period} aria-labelledby={`${headingId}-${index}`}>
          <Typography
            id={`${headingId}-${index}`}
            component="h2"
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
      {/* The browser follows the session being created, as it does from the session menu. */}
      <NewSessionDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={() => router.push("/browser")}
      />
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

/** A centered column, narrow enough to scan each row. */
const pageSx = { maxWidth: 720, mx: "auto", pt: 2 } as const;

/** The search field, with New session beside it. */
const barSx = { display: "flex", alignItems: "center", gap: 1, px: 0.5, pb: 1 } as const;
