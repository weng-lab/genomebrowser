"use client";

import { AgentControlBoundary } from "../../agent/components/AgentControlBoundary";
import { useAgentControl } from "../../agent/RemoteControlProvider";
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
      {/* Saved regions change the session, so they wait while the agent has control. */}
      <AgentControlBoundary
        sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}
      >
        <HeldRegions />
      </AgentControlBoundary>
    </Box>
  );
}

/**
 * The saved regions, started afresh when the agent takes control, so a menu or
 * dialog the user had open, which renders outside the inert panel, closes.
 */
function HeldRegions() {
  const { held } = useAgentControl();
  return <RegionsPanel key={held ? "held" : "free"} />;
}
