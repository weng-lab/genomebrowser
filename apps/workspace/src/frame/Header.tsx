import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { SIDE_BAR_WIDTH, TITLE_ROW_HEIGHT } from "./layout";

type HeaderProps = {
  /** The left panel toggle, shown just right of the side bar. */
  leftToggle?: ReactNode;
  /** The right panel toggle, shown at the far right. */
  rightToggle?: ReactNode;
};

/**
 * Floats across the top of the workspace, over the panels' title rows. The panels run the
 * full window height and slide beneath it, so its controls stay in place on every page.
 * Only its controls take pointer input; the rest passes through to the title rows.
 */
export function Header({ leftToggle, rightToggle }: HeaderProps) {
  const controlSx = {
    position: "absolute",
    top: 0,
    display: "flex",
    alignItems: "center",
    height: TITLE_ROW_HEIGHT,
    pointerEvents: "auto",
  } as const;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: "0 0 auto 0",
        zIndex: 2,
        height: TITLE_ROW_HEIGHT,
        pointerEvents: "none",
      }}
    >
      {leftToggle && <Box sx={{ ...controlSx, left: SIDE_BAR_WIDTH + 4 }}>{leftToggle}</Box>}
      {rightToggle && <Box sx={{ ...controlSx, right: 4 }}>{rightToggle}</Box>}
    </Box>
  );
}
