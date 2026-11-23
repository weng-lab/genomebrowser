"use client";

import Info from "@mui/icons-material/Info";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { textBoxTrim } from "../../../shared/ui/theme";
import type { SessionState } from "../session";
import { formatSavedAt, formatTrackCount } from "../sessionDetails";
import { useSession } from "../SessionProvider";

/**
 * The open session's name on a tinted card. Its info button shows the details a session
 * row shows: the assembly, when it was last saved, and how many tracks it has.
 */
export function CurrentSessionCard() {
  const id = useSession((session) => session.active?.id);
  const name = useSession((session) => session.active?.name);
  if (id === undefined) return null;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 1.25,
        pl: 1.5,
        pr: 1,
        borderRadius: 2,
        bgcolor: "background.muted",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" color="primary.light" noWrap>
          Current Session
        </Typography>
        <Typography noWrap sx={{ fontWeight: "fontWeightMedium" }}>
          {name}
        </Typography>
      </Box>
      <SessionDetailsButton id={id} />
    </Box>
  );
}

/**
 * Shows the saved session's details on hover, focus, or a click, which also works by touch.
 * It renders nothing until the session's saved details are known.
 */
function SessionDetailsButton({ id }: { id: string }) {
  const find = ({ sessions }: SessionState) => sessions.find((saved) => saved.id === id);
  const savedAt = useSession((session) => find(session)?.updatedAt.getTime());
  const assembly = useSession((session) => find(session)?.assembly);
  const trackCount = useSession((session) => find(session)?.trackCount);
  // When the details opened, which the save time is relative to. Closed while unset.
  const [openedAt, setOpenedAt] = useState<Date>();
  if (savedAt === undefined || assembly === undefined || trackCount === undefined) return null;

  const details = [
    ["Assembly", assembly],
    ["Modified", openedAt && formatSavedAt(new Date(savedAt), openedAt)],
    ["Tracks", formatTrackCount(trackCount)],
  ] as const;
  return (
    <Tooltip
      open={openedAt !== undefined}
      onOpen={() => setOpenedAt(new Date())}
      onClose={() => setOpenedAt(undefined)}
      describeChild
      placement="bottom-end"
      title={
        <Box
          component="dl"
          sx={{
            display: "grid",
            gridTemplateColumns: "auto auto",
            columnGap: 1.5,
            rowGap: 1,
            m: 0,
            "& dt, & dd": { m: 0, ...textBoxTrim },
            "& dt": { opacity: 0.72 },
          }}
        >
          {details.map(([term, value]) => (
            <Box key={term} sx={{ display: "contents" }}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </Box>
          ))}
        </Box>
      }
    >
      <IconButton
        size="small"
        aria-label="Session details"
        onClick={() => setOpenedAt(openedAt ? undefined : new Date())}
        sx={{ flexShrink: 0, color: "primary.main" }}
      >
        <Info />
      </IconButton>
    </Tooltip>
  );
}
