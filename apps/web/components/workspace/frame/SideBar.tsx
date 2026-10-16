import { WorkspaceNavigationDisabledContext } from "../navigationState";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, type ReactNode } from "react";
import { SIDE_BAR_WIDTH } from "./layout";
import type { WorkspaceNavigationItem } from "../types";

type SideBarProps = { navigation: readonly WorkspaceNavigationItem[]; footer?: ReactNode };
export function SideBar({ navigation, footer }: SideBarProps) {
  const pathname = usePathname();
  const navigationDisabled = useContext(WorkspaceNavigationDisabledContext);
  const pageLink = (item: WorkspaceNavigationItem) => {
    const exact = item.href === pathname;
    const current =
      exact || (item.href !== "/" && pathname.startsWith(`${item.href.replace(/\/$/, "")}/`));
    return (
      <Tooltip key={item.href} title={item.label} placement="right">
        <IconButton
          component={Link}
          href={item.href}
          disabled={navigationDisabled}
          onNavigate={(event: { preventDefault(): void }) => {
            if (navigationDisabled) event.preventDefault();
          }}
          aria-label={item.label}
          aria-current={exact ? "page" : current ? "location" : undefined}
          color={current ? "primary" : "default"}
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
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        alignItems: "center",
        gap: 0.5,
        width: SIDE_BAR_WIDTH,
        p: 0.5,
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      {navigation.filter((item) => item.placement !== "bottom").map(pageLink)}
      <Box sx={{ flexGrow: 1 }} />
      {navigation.filter((item) => item.placement === "bottom").map(pageLink)}
      {footer}
    </Box>
  );
}
