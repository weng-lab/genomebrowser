import type { Theme } from "@mui/material/styles";

/** Height of the floating header and of every column's title row beneath it. */
export const TITLE_ROW_HEIGHT = 48;

/** The side bar's width: a 40px icon button, 4px padding on each side, and its border. */
export const SIDE_BAR_WIDTH = 49;

/** Padding that keeps a title row's content clear of a header toggle at that end. */
export const TOGGLE_CLEARANCE = 6.5;

/**
 * The top row of each column. The rows line up so their bottom borders form one line.
 * Set `animate` while a panel toggle animates, so content slides clear of the header's
 * toggles with the panel; otherwise the padding changes instantly, as on page changes.
 */
export function titleRowSx({ clearLeft = false, clearRight = false, animate = false } = {}) {
  return {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    // The content area matches the header's height, with the border drawn below it, so
    // title text and the header's toggles share the same vertical center.
    boxSizing: "content-box",
    height: TITLE_ROW_HEIGHT,
    pl: clearLeft ? TOGGLE_CLEARANCE : 1.5,
    pr: clearRight ? TOGGLE_CLEARANCE : 1.5,
    borderBottom: 1,
    borderColor: "divider",
    // Give every title the same line box, including in browsers without text-box support.
    "& .MuiTypography-root, & .MuiBreadcrumbs-li, & .MuiBreadcrumbs-separator": {
      textBox: "normal",
      lineHeight: "20px",
      paddingBlock: 0,
    },
    transition: (theme: Theme) =>
      animate
        ? theme.transitions.create("padding", {
            duration: theme.transitions.duration.shorter,
            easing: theme.transitions.easing.easeInOut,
          })
        : "none",
    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
  } as const;
}
