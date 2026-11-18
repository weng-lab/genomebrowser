import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha, type Theme } from "@mui/material/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SIDE_BAR_WIDTH } from "./layout";
import { primarySurfaceSx } from "../theme";
import type { WorkspaceNavigationItem } from "../types";

type SideBarProps = { navigation: readonly WorkspaceNavigationItem[]; footer?: ReactNode };
export function SideBar({ navigation, footer }: SideBarProps) {
  const pathname = usePathname();
  const pageLink = (item: WorkspaceNavigationItem) => {
    const exact = item.href === pathname;
    const current =
      exact || (item.href !== "/" && pathname.startsWith(`${item.href.replace(/\/$/, "")}/`));
    return (
      <Tooltip key={item.href} title={item.label} placement="right">
        <IconButton
          component={Link}
          href={item.href}
          aria-label={item.label}
          aria-current={exact ? "page" : current ? "location" : undefined}
          sx={[linkSx, current && currentLinkSx]}
        >
          {item.icon}
        </IconButton>
      </Tooltip>
    );
  };
  return (
    <Box
      component="nav"
      aria-label="Workspace"
      sx={{
        ...primarySurfaceSx,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        alignItems: "center",
        gap: 0.5,
        width: SIDE_BAR_WIDTH,
        p: 0.5,
        borderRight: 1,
        borderColor: (theme) => alpha(theme.palette.primary.contrastText, 0.12),
      }}
    >
      {navigation.filter((item) => item.placement !== "bottom").map(pageLink)}
      <Box sx={{ flexGrow: 1 }} />
      {navigation.filter((item) => item.placement === "bottom").map(pageLink)}
      {footer}
    </Box>
  );
}

const linkSx = { borderRadius: 1.5 } as const;

/** The current page's link sits on a lighter square, since the primary color is the bar itself. */
const currentLinkSx = {
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.16),
} as const;
