"use client";

import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { SideBar } from "./frame/SideBar";
import { PanelStateProvider } from "./panels/panelState";
import { theme } from "./theme";
import type { WorkspaceNavigation } from "./types";

export type WorkspaceProps = {
  navigation: WorkspaceNavigation;
  children: ReactNode;
  /** Shown at the top of the side bar, above the navigation, such as the app's logo. */
  brand?: ReactNode;
  footer?: ReactNode;
};
export function Workspace({ navigation, children, brand, footer }: WorkspaceProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PanelStateProvider>
        <Box sx={{ position: "relative", display: "flex", height: "100dvh", overflow: "hidden" }}>
          <SideBar navigation={navigation} brand={brand} footer={footer} />
          <Box sx={{ display: "flex", flexGrow: 1, minWidth: 0 }}>{children}</Box>
        </Box>
      </PanelStateProvider>
    </ThemeProvider>
  );
}
