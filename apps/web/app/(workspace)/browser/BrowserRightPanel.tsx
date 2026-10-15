"use client";

import { lazy, Suspense, useId, useState } from "react";
import Typography from "@mui/material/Typography";
import { usePanelState } from "../../../components/workspace/panels/panelState";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { AgentPanel } from "./AgentPanel";

const BrowserActiveTracks = lazy(() => import("./BrowserActiveTracks"));

export function BrowserRightPanel() {
  const [tab, setTab] = useState("active-tracks");
  const id = useId();
  const rightOpen = usePanelState((state) => state.rightOpen);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Tabs
        value={tab}
        onChange={(_event, value: string) => setTab(value)}
        aria-label="Browser tools"
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Tab
          value="active-tracks"
          label="Active Tracks"
          id={`${id}-active-tracks-tab`}
          aria-controls={`${id}-active-tracks-panel`}
        />
        <Tab
          value="agent"
          label="Agent"
          id={`${id}-agent-tab`}
          aria-controls={`${id}-agent-panel`}
        />
      </Tabs>
      <Box
        role="tabpanel"
        id={`${id}-agent-panel`}
        aria-labelledby={`${id}-agent-tab`}
        hidden={tab !== "agent"}
        tabIndex={0}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        <AgentPanel />
      </Box>
      <Box
        role="tabpanel"
        id={`${id}-active-tracks-panel`}
        aria-labelledby={`${id}-active-tracks-tab`}
        hidden={tab !== "active-tracks"}
        tabIndex={0}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        {rightOpen && tab === "active-tracks" && (
          <Suspense
            fallback={
              <Typography role="status" sx={{ p: 2 }}>
                Loading active tracks...
              </Typography>
            }
          >
            <BrowserActiveTracks />
          </Suspense>
        )}
      </Box>
    </Box>
  );
}
