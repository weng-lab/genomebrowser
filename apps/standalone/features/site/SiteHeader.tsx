"use client";

import { AppBar, Box, Button, Stack, Toolbar } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountControls } from "../auth/AccountControls";

export function SiteHeader({ authConfigured }: { authConfigured: boolean }) {
  const pathname = usePathname();
  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
    >
      <Toolbar
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr auto", sm: "1fr auto auto" },
          gap: 2,
          py: 1.5,
          px: { xs: 2, md: 4 },
        }}
      >
        <Stack
          component="nav"
          aria-label="Main navigation"
          direction="row"
          spacing={0.5}
          sx={{ gridColumn: { xs: "1 / -1", sm: "auto" }, gridRow: { xs: 2, sm: 1 } }}
        >
          {[
            { href: "/", label: "Home" },
            { href: "/browser", label: "Browser" },
          ].map(({ href, label }) => (
            <Button
              key={href}
              component={Link}
              href={href}
              color="secondary"
              aria-current={pathname === href ? "page" : undefined}
              sx={{
                bgcolor: pathname === href ? "action.selected" : undefined,
                minWidth: 0,
                px: 1.5,
              }}
            >
              {label}
            </Button>
          ))}
        </Stack>
        {authConfigured && (
          <Box
            sx={{
              justifySelf: "end",
              minWidth: 76,
              minHeight: 36,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <AccountControls />
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
