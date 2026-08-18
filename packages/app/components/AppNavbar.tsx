"use client";

import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Link from "next/link";

const screenBlue = "#0c184a";

export function AppNavbar() {
  return (
    <AppBar component="nav" elevation={0} position="static" sx={{ bgcolor: screenBlue }}>
      <Toolbar variant="dense" sx={{ gap: 1, "& .MuiButton-root": { textTransform: "none" } }}>
        <Button color="inherit" component={Link} href="/">
          Home
        </Button>
        <Button color="inherit" component={Link} href="/zoom-prototypes">
          Zoom prototypes
        </Button>
      </Toolbar>
    </AppBar>
  );
}
