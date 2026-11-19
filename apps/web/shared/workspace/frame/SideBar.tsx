import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha, type Theme } from "@mui/material/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { SIDE_BAR_WIDTH } from "./layout";
import { primarySurfaceSx } from "../theme";
import type { WorkspaceNavigation, WorkspaceNavigationItem } from "../types";

type SideBarProps = {
  navigation: WorkspaceNavigation;
  brand?: ReactNode;
  footer?: ReactNode;
};
export function SideBar({ navigation, brand, footer }: SideBarProps) {
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
  // The brand, when given, is its own section above the link groups.
  const sections = [
    ...(brand ? [{ key: "brand", content: brand }] : []),
    ...navigation.sections
      .filter((items) => items.length > 0)
      .map((items) => ({ key: items[0].href, content: items.map(pageLink) })),
  ];
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
      {sections.map(({ key, content }, index) => (
        <Fragment key={key}>
          {index > 0 && <Divider sx={dividerSx} />}
          {content}
        </Fragment>
      ))}
      <Box sx={{ flexGrow: 1 }} />
      {navigation.bottom?.map(pageLink)}
      {footer}
    </Box>
  );
}

const linkSx = { borderRadius: 1.5 } as const;

/** Spans the bar, inset from its edges, with room above and below. */
const dividerSx = { alignSelf: "stretch", mx: 0.5, my: 0.5 } as const;

/**
 * The current page's link sits on a lighter square, since the primary color is the bar itself.
 * Hover and keyboard focus strengthen the square rather than fading it to the bar's hover tint.
 */
const currentLinkSx = {
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.16),
  "&:hover, &.Mui-focusVisible": {
    bgcolor: (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.24),
  },
} as const;
