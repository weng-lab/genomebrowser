"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { useHotkey } from "@tanstack/react-hotkeys";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "./frame/Header";
import { PageTitleRow } from "./frame/PageTitleRow";
import { PanelButton } from "./panels/PanelButton";
import { PanelToggleButton } from "./panels/PanelToggleButton";
import { SidePanel } from "./panels/SidePanel";
import { useTransitionEnabled } from "./useTransitionEnabled";
import { usePanelState } from "./panels/panelState";
import type { WorkspacePanel } from "./types";

export type WorkspacePageProps = {
  title: string;
  subtitle?: ReactNode;
  /** Replaces the center title row's breadcrumbs, at its left end. It renders the page's own `h1`. */
  heading?: ReactNode;
  /** Shown at the title row's right end, before the right panel's button. */
  actions?: ReactNode;
  /**
   * The left panel, or panels with ids that navigation entries choose between. The first shows
   * until an entry chooses another.
   */
  left?: WorkspacePanel | readonly WorkspacePanel[];
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
  const leftPanel = usePanelState((state) => state.leftPanel);
  const rightOpen = usePanelState((state) => state.rightOpen);
  const toggle = usePanelState((state) => state.toggle);
  const toggleLeft = () => toggle("left");
  const toggleRight = () => toggle("right");
  const transitionEnabled = useTransitionEnabled(usePathname());
  const leftPanels = left === undefined ? [] : "children" in left ? [left] : left;
  const shownLeft: WorkspacePanel | undefined =
    leftPanels.find(({ id }) => id === leftPanel) ?? leftPanels[0];
  useHotkey({ key: "B", ctrl: true }, toggleLeft, {
    enabled: shownLeft !== undefined,
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
          shownLeft && (
            <PanelToggleButton
              side="left"
              open={leftOpen}
              onToggle={toggleLeft}
              tooltipPlacement="bottom"
            />
          )
        }
      />
      <SidePanel side="left" panel={shownLeft} open={leftOpen} animate={transitionEnabled} />
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
        <PageTitleRow
          label={title}
          title={subtitle}
          heading={heading}
          actions={
            (actions || right) && (
              <>
                {actions}
                {actions && right && <Divider orientation="vertical" sx={{ height: 32, mx: 1 }} />}
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
          clearLeftToggle={shownLeft !== undefined && !leftOpen}
          animate={transitionEnabled}
        />
        <Box
          component="main"
          sx={{ flexGrow: 1, minHeight: 0, overflow: "auto", p: 1, bgcolor: "background.subtle" }}
        >
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
