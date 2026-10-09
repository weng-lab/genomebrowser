import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useId, type ReactNode } from "react";
import { titleRowSx } from "../frame/layout";

type SidePanelProps = {
  title: string;
  /** Which header toggle the title row sits under: the left one for the left panel, and so on. */
  side: "left" | "right";
  children: ReactNode;
};

/** A side panel's contents: its title row and a scrolling body supplied by the page. */
export function SidePanel({ title, side, children }: SidePanelProps) {
  const titleId = useId();
  return (
    <Box
      component="aside"
      aria-labelledby={titleId}
      sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}
    >
      <Box sx={titleRowSx({ clearLeft: side === "left", clearRight: side === "right" })}>
        <Typography id={titleId} variant="subtitle2" component="h2" noWrap>
          {title}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
