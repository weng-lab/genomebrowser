"use client";

import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useId, useState } from "react";
import { RegionsPanel } from "./RegionsPanel";
import { SessionPanel } from "./SessionPanel";

/** Browser-local tabs leave the session stores and autosave mounted. */
export function SessionRegionsPanel() {
  const [tab, setTab] = useState(0);
  const id = useId();
  return (
    <>
      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="fullWidth"
        aria-label="Session tools"
      >
        {["Sessions", "Regions"].map((label, index) => (
          <Tab
            key={label}
            label={label}
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
          />
        ))}
      </Tabs>
      {[<SessionPanel key="sessions" />, <RegionsPanel key="regions" />].map((content, index) => (
        <Box
          key={content.key}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={tab !== index}
          sx={{
            display: tab === index ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          {tab === index && content}
        </Box>
      ))}
    </>
  );
}
