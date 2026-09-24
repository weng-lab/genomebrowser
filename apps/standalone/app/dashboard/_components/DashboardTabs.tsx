"use client";

import { useState, type ReactNode } from "react";
import { Box, Tab, Tabs } from "@mui/material";

export function DashboardTabs({
  sessions,
  collections,
}: {
  sessions: ReactNode;
  collections: ReactNode;
}) {
  const [tab, setTab] = useState(0);
  return (
    <>
      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        aria-label="Dashboard"
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          id="dashboard-sessions-tab"
          aria-controls="dashboard-sessions-panel"
          label="Sessions"
        />
        <Tab
          id="dashboard-collections-tab"
          aria-controls="dashboard-collections-panel"
          label="Custom tracks / collections"
        />
      </Tabs>
      <Box
        role="tabpanel"
        id="dashboard-sessions-panel"
        aria-labelledby="dashboard-sessions-tab"
        hidden={tab !== 0}
      >
        {tab === 0 && sessions}
      </Box>
      <Box
        role="tabpanel"
        id="dashboard-collections-panel"
        aria-labelledby="dashboard-collections-tab"
        hidden={tab !== 1}
      >
        {tab === 1 && collections}
      </Box>
    </>
  );
}
