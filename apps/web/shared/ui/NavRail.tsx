import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha, type Theme } from "@mui/material/styles";
import { Fragment, type ElementType, type MouseEvent, type ReactNode } from "react";
import { primarySurfaceSx } from "./theme";

/** The rail's width: a 40px icon button, 4px padding on each side, and its border. */
const NAV_RAIL_WIDTH = 49;

/** A link when it has `href`, otherwise a button that shows and hides a panel. */
export type NavRailItem = {
  /** Names the item, so it must be unique within the rail. */
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** A link's `page` for the page it opens, `location` for a page inside it. */
  current?: "page" | "location";
  /** A button's panel: whether it is shown, and its element's id. */
  expanded?: boolean;
  controls?: string;
};

export type NavRailProps = {
  "aria-label": string;
  /** Groups of items from the top. A line separates each group. */
  sections: readonly (readonly NavRailItem[])[];
  /** Items at the bottom, above the footer. */
  bottom?: readonly NavRailItem[];
  /** Shown above the first group, with a line below it, such as the app's logo. */
  brand?: ReactNode;
  /** Shown last, such as account controls. */
  footer?: ReactNode;
  /** Renders each link, such as Next.js `Link`. Defaults to `a`. */
  linkComponent?: ElementType;
};

/**
 * The navy column of icon links and panel buttons at the window's left edge. Each item shows
 * its label as a tooltip and is named by it; the current link, or a button while its panel is
 * shown, sits on a lighter square.
 */
export function NavRail({
  "aria-label": ariaLabel,
  sections,
  bottom = [],
  brand,
  footer,
  linkComponent = "a",
}: NavRailProps) {
  const item = ({ href, label, icon, onClick, current, expanded, controls }: NavRailItem) => (
    <Tooltip key={label} title={label} placement="right">
      <IconButton
        {...(href === undefined
          ? { "aria-expanded": expanded, "aria-controls": controls }
          : { component: linkComponent, href, "aria-current": current })}
        aria-label={label}
        onClick={onClick}
        sx={[linkSx, (current !== undefined || expanded === true) && currentLinkSx]}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
  const groups = [
    ...(brand ? [{ key: "brand", content: brand }] : []),
    ...sections
      .filter((items) => items.length > 0)
      .map((items) => ({ key: items[0].label, content: items.map(item) })),
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
      {bottom.map(item)}
      {footer}
    </Box>
  );
}

/** The rail's navy column, also used by placeholders that stand in for it while loading. */
export const railSx = {
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

/**
 * The current link sits on a lighter square, since the primary color is the rail itself.
 * Hover and keyboard focus strengthen the square rather than fading it to the rail's hover tint.
 */
const currentLinkSx = {
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.16),
  "&:hover, &.Mui-focusVisible": {
    bgcolor: (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.24),
  },
} as const;

/** Spans the rail, inset from its edges, with room above and below. */
const dividerSx = { alignSelf: "stretch", mx: 0.5, my: 0.5 } as const;
