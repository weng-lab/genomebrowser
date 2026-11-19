import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha, type Theme } from "@mui/material/styles";
import { Fragment, type ElementType, type ReactNode } from "react";
import { primarySurfaceSx } from "./theme";

/** The rail's width: a 40px icon button, 4px padding on each side, and its border. */
export const NAV_RAIL_WIDTH = 49;

export type NavRailItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** `page` for the page the link opens, `location` for a page inside it. */
  current?: "page" | "location";
};

export type NavRailProps = {
  "aria-label": string;
  /** Groups of links from the top. A line separates each group. */
  sections: readonly (readonly NavRailItem[])[];
  /** Links at the bottom, above the footer. */
  bottom?: readonly NavRailItem[];
  /** Shown above the first group, with a line below it, such as the app's logo. */
  brand?: ReactNode;
  /** Shown last, such as account controls. */
  footer?: ReactNode;
  /** Renders each link, such as Next.js `Link`. Defaults to `a`. */
  linkComponent?: ElementType;
};

/**
 * The navy column of icon links at the window's left edge. Each link shows its label as a
 * tooltip and is named by it; the current one sits on a lighter square.
 */
export function NavRail({
  "aria-label": ariaLabel,
  sections,
  bottom = [],
  brand,
  footer,
  linkComponent = "a",
}: NavRailProps) {
  const link = ({ href, label, icon, current }: NavRailItem) => (
    <Tooltip key={href} title={label} placement="right">
      <IconButton
        component={linkComponent}
        href={href}
        aria-label={label}
        aria-current={current}
        sx={[linkSx, current !== undefined && currentLinkSx]}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
  const groups = [
    ...(brand ? [{ key: "brand", content: brand }] : []),
    ...sections
      .filter((items) => items.length > 0)
      .map((items) => ({ key: items[0].href, content: items.map(link) })),
  ];
  return (
    <Box component="nav" aria-label={ariaLabel} sx={railSx}>
      {groups.map(({ key, content }, index) => (
        <Fragment key={key}>
          {index > 0 && <Divider sx={dividerSx} />}
          {content}
        </Fragment>
      ))}
      <Box sx={{ flexGrow: 1 }} />
      {bottom.map(link)}
      {footer}
    </Box>
  );
}

const railSx = {
  ...primarySurfaceSx,
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  alignItems: "center",
  gap: 0.5,
  width: NAV_RAIL_WIDTH,
  p: 0.5,
  borderRight: 1,
  borderColor: (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.12),
} as const;

const linkSx = { borderRadius: 1.5 } as const;

/** The current link sits on a lighter square, since the primary color is the rail itself. */
const currentLinkSx = {
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.16),
} as const;

/** Spans the rail, inset from its edges, with room above and below. */
const dividerSx = { alignSelf: "stretch", mx: 0.5, my: 0.5 } as const;
