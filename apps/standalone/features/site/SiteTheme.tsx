"use client";

import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import type { ReactNode } from "react";

const theme = createTheme({
  palette: {
    primary: { main: "#116c67" },
    secondary: { main: "#263b50" },
    background: { default: "#fbfcfa", paper: "#ffffff" },
    text: { primary: "#1c303f", secondary: "#556671" },
    divider: "#dce3df",
  },
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    h1: { fontWeight: 600, letterSpacing: "-0.045em" },
    h2: { fontWeight: 600, letterSpacing: "-0.025em" },
    h3: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: { MuiButton: { defaultProps: { disableElevation: true } } },
});

export function SiteTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
