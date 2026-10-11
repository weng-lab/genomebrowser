"use client";

import Box from "@mui/material/Box";
import { useHotkey } from "@tanstack/react-hotkeys";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "./frame/Header";
import { PageTitleRow } from "./frame/PageTitleRow";
import { PanelToggleButton } from "./panels/PanelToggleButton";
import { SidePanelSlot } from "./panels/SidePanelSlot";
import { useTransitionEnabled } from "./motion/useTransitionEnabled";
import { useWorkspacePreferences } from "./preferences";
import type { WorkspacePanel } from "./types";

export type WorkspacePageProps = {
  title: string;
  subtitle?: ReactNode;
  left?: WorkspacePanel;
  right?: WorkspacePanel;
  children: ReactNode;
};
export function WorkspacePage({ title, subtitle, left, right, children }: WorkspacePageProps) {
  const leftOpen = useWorkspacePreferences((state) => state.leftOpen);
  const rightOpen = useWorkspacePreferences((state) => state.rightOpen);
  const toggle = useWorkspacePreferences((state) => state.toggle);
  const toggleLeft = () => toggle("left");
  const toggleRight = () => toggle("right");
  const transitionEnabled = useTransitionEnabled(usePathname());
  useHotkey({ key: "B", ctrl: true }, toggleLeft, {
    enabled: left !== undefined,
    ignoreInputs: true,
    requireReset: true,
    preventDefault: true,
    stopPropagation: true,
  });
  useHotkey({ key: "B", ctrl: true, alt: true }, toggleRight, {
    enabled: right !== undefined,
    ignoreInputs: true,
    requireReset: true,
    preventDefault: true,
    stopPropagation: true,
  });

  return (
    <Box
      sx={{ position: "relative", display: "flex", flexGrow: 1, minWidth: 0, overflow: "hidden" }}
    >
      <Header
        leftToggle={
          left && (
            <PanelToggleButton
              side="left"
              open={leftOpen}
              onToggle={toggleLeft}
              tooltipPlacement="bottom"
            />
          )
        }
        rightToggle={
          right && (
            <PanelToggleButton
              side="right"
              open={rightOpen}
              onToggle={toggleRight}
              tooltipPlacement="bottom"
            />
          )
        }
      />
      <SidePanelSlot side="left" panel={left} open={leftOpen} animate={transitionEnabled} />
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
        <PageTitleRow
          label={title}
          title={subtitle}
          clearLeftToggle={left !== undefined && !leftOpen}
          clearRightToggle={right !== undefined && !rightOpen}
          animate={transitionEnabled}
        />
        <Box component="main" sx={{ flexGrow: 1, minHeight: 0, overflow: "auto", p: 1 }}>
          {children}
        </Box>
      </Box>
      <SidePanelSlot side="right" panel={right} open={rightOpen} animate={transitionEnabled} />
    </Box>
  );
}
