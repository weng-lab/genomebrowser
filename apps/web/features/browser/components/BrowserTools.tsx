"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { CurrentSessionCard } from "../../sessions/components/CurrentSessionCard";
import { RegionsPanel } from "../regions/components/RegionsPanel";

/** The browser's left panel: the open session's card, then its saved regions. */
export function BrowserTools() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
      <Box sx={{ px: 1.5, pt: 1.5 }}>
        <CurrentSessionCard />
        <Divider sx={{ mt: 1.5 }} />
      </Box>
      <RegionsPanel />
    </Box>
  );
}
