"use client";

import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionNavigation } from "../sessions/SessionNavigation";
import { AccountControls } from "../auth/AccountControls";

const siteMap = [
  { href: "/", label: "Home" },
  { href: "/browser", label: "Browser" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteHeader({ authConfigured }: { authConfigured: boolean }) {
  const pathname = usePathname();
  const { session } = useSessionNavigation();
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
          gridTemplateColumns: { xs: "minmax(0, 1fr) auto", sm: "auto minmax(0, 1fr) auto" },
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
          {siteMap.map(({ href, label }) => {
            const isBrowser = href === "/browser";
            const selected = isBrowser ? pathname.startsWith("/browser") : pathname === href;
            const destination =
              isBrowser && session ? `/browser/${encodeURIComponent(session.id)}` : href;
            return (
              <Button
                key={href}
                component={Link}
                href={destination}
                prefetch={isBrowser ? false : undefined}
                color="secondary"
                aria-current={selected ? "page" : undefined}
                sx={{
                  bgcolor: selected ? "action.selected" : undefined,
                  minWidth: 0,
                  px: 1.5,
                }}
              >
                {label}
              </Button>
            );
          })}
        </Stack>
        <Box sx={{ minWidth: 0, gridColumn: { xs: 1, sm: 2 }, gridRow: 1 }}>
          {session && (
            <Typography noWrap title={session.name} variant="subtitle1" sx={{ fontWeight: 600 }}>
              {session.name}
            </Typography>
          )}
        </Box>
        {authConfigured && (
          <Box
            sx={{
              gridColumn: { xs: 2, sm: 3 },
              gridRow: 1,
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
