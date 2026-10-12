"use client";

import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { SideBar } from "./frame/SideBar";
import { PanelStateProvider } from "./panels/panelState";
import { theme } from "./theme";
import type { WorkspaceNavigationItem } from "./types";

export type WorkspaceProps = {
  navigation: readonly WorkspaceNavigationItem[];
  children: ReactNode;
  footer?: ReactNode;
};
export function Workspace({ navigation, children, footer }: WorkspaceProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PanelStateProvider>
        <Box sx={{ position: "relative", display: "flex", height: "100dvh", overflow: "hidden" }}>
          <SideBar navigation={navigation} footer={footer} />
          <Box sx={{ display: "flex", flexGrow: 1, minWidth: 0 }}>{children}</Box>
        </Box>
      </PanelStateProvider>
    </ThemeProvider>
  );
}
