"use client";

import Box from "@mui/material/Box";
import { useHotkey } from "@tanstack/react-hotkeys";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "./frame/Header";
import { PageTitleRow } from "./frame/PageTitleRow";
import { PanelButton } from "./panels/PanelButton";
import { PanelToggleButton } from "./panels/PanelToggleButton";
import { SidePanel } from "./panels/SidePanel";
import { MovableSlot, useMovable } from "./movable";
import { useTransitionEnabled } from "./useTransitionEnabled";
import { usePanelState } from "./panels/panelState";
import type { WorkspacePanel } from "./types";

export type WorkspacePageProps = {
  title: string;
  subtitle?: ReactNode;
  /**
   * Replaces the title row's breadcrumbs. It renders the page's own `h1`. With a left
   * panel, it sits in that panel's title row while the panel is open, so it stays at the
   * top left. It moves without remounting, so it keeps its state.
   */
  heading?: ReactNode;
  /** Shown at the title row's right end, before the right panel's button. */
  actions?: ReactNode;
  left?: WorkspacePanel;
  right?: WorkspacePanel;
  children: ReactNode;
};
export function WorkspacePage({
  title,
  subtitle,
  heading,
  actions,
  left,
  right,
  children,
}: WorkspacePageProps) {
  const leftOpen = usePanelState((state) => state.leftOpen);
  const rightOpen = usePanelState((state) => state.rightOpen);
  const toggle = usePanelState((state) => state.toggle);
  const toggleLeft = () => toggle("left");
  const toggleRight = () => toggle("right");
  const transitionEnabled = useTransitionEnabled(usePathname());
  // Only a page with a left panel moves its heading; others render it in place.
  const movesHeading = left !== undefined && heading !== undefined;
  const [movableHeading, headingPortal] = useMovable(movesHeading ? heading : null);
  const headingInLeftPanel = movesHeading && leftOpen;
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
      />
      {headingPortal}
      <SidePanel
        side="left"
        panel={left}
        open={leftOpen}
        animate={transitionEnabled}
        heading={
          movesHeading ? (
            <MovableSlot movable={movableHeading} active={headingInLeftPanel} />
          ) : undefined
        }
      />
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
        <PageTitleRow
          label={title}
          title={subtitle}
          heading={
            movesHeading ? (
              <MovableSlot movable={movableHeading} active={!headingInLeftPanel} />
            ) : (
              heading
            )
          }
          actions={
            (actions || right) && (
              <>
                {actions}
                {right && (
                  <PanelButton
                    title={right.title}
                    icon={right.icon}
                    open={rightOpen}
                    onToggle={toggleRight}
                  />
                )}
              </>
            )
          }
          clearLeftToggle={left !== undefined && !leftOpen}
          animate={transitionEnabled}
        />
        <Box component="main" sx={{ flexGrow: 1, minHeight: 0, overflow: "auto", p: 1 }}>
          {children}
        </Box>
      </Box>
      <SidePanel
        side="right"
        panel={right}
        open={rightOpen}
        animate={transitionEnabled}
        onClose={toggleRight}
      />
    </Box>
  );
}
