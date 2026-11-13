import Close from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useId, type ReactNode } from "react";
import { titleRowSx } from "../frame/layout";
import { usePanelState } from "./panelState";
import { Resizable } from "./Resizable";
import type { Side, WorkspacePanel } from "../types";

const sidePanelSizes = {
  left: { defaultWidth: 240, minWidth: 180, maxWidth: 480 },
  right: { defaultWidth: 360, minWidth: 280, maxWidth: 720 },
} satisfies Record<Side, { defaultWidth: number; minWidth: number; maxWidth: number }>;

type SidePanelProps = {
  side: Side;
  /** The current page's panel on this side, if it has one. */
  panel: WorkspacePanel | undefined;
  open: boolean;
  animate: boolean;
  /** Replaces the panel's title in its title row, such as with the page's heading. */
  heading?: ReactNode;
  /** Adds a close button to the title row. */
  onClose?: () => void;
};

/** A workspace panel with persistent sizing, a title, and page-supplied content. */
export function SidePanel({ side, panel, open, animate, heading, onClose }: SidePanelProps) {
  const titleId = useId();
  const width = usePanelState((state) => (side === "left" ? state.leftWidth : state.rightWidth));
  const setWidth = usePanelState((state) => state.setWidth);
  return (
    <Resizable
      id={`${side}-panel`}
      side={side}
      open={panel !== undefined && open}
      width={width}
      onWidthChange={(width) => setWidth(side, width)}
      animate={animate}
      {...sidePanelSizes[side]}
      resizeLabel={`Resize ${side} panel`}
    >
      {panel && (
        <Box
          component="aside"
          aria-labelledby={heading === undefined ? titleId : undefined}
          aria-label={heading === undefined ? undefined : panel.title}
          sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}
        >
          <Box sx={{ ...titleRowSx({ clearLeft: side === "left" }), pr: onClose ? 0.5 : 1.5 }}>
            {heading ?? (
              <Typography id={titleId} variant="subtitle2" component="h2" noWrap>
                {panel.title}
              </Typography>
            )}
            {onClose && (
              <IconButton
                size="small"
                aria-label={`Close ${panel.title} panel`}
                title={`Close ${panel.title} panel`}
                onClick={onClose}
                sx={{ ml: "auto" }}
              >
                <Close fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
            {panel.children}
          </Box>
        </Box>
      )}
    </Resizable>
  );
}
