import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import type { ReactNode } from "react";
import { narrowTitleRow, visuallyHidden } from "../frame/layout";

type PanelButtonProps = {
  /** The panel's title, which the button shows. */
  title: string;
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
};

/**
 * Shows or hides the right panel from the page's title row. It stays in place while the
 * panel is open, highlighted, and the panel's own close button hides it too.
 */
export function PanelButton({ title, icon, open, onToggle }: PanelButtonProps) {
  return (
    <Tooltip title={`${open ? "Hide" : "Show"} ${title} panel (Ctrl+Alt+B)`} placement="bottom">
      <Button
        variant="outlined"
        size="small"
        startIcon={icon}
        aria-expanded={open}
        aria-controls="right-panel"
        aria-keyshortcuts="Control+Alt+b"
        onClick={onToggle}
        sx={[buttonSx, icon !== undefined && iconOnlyWhenNarrowSx, open && openSx]}
      >
        {icon === undefined ? (
          title
        ) : (
          <Box component="span" sx={{ [narrowTitleRow]: visuallyHidden }}>
            {title}
          </Box>
        )}
      </Button>
    </Tooltip>
  );
}

const buttonSx = {
  flexShrink: 0,
  height: 34,
  px: 1.75,
  borderRadius: 1.5,
  textTransform: "none",
  typography: "body1",
  "& .MuiButton-startIcon": { mr: 1 },
} as const;

/** In a narrow title row, only the icon shows; the title stays the button's name. */
const iconOnlyWhenNarrowSx = {
  [narrowTitleRow]: { minWidth: 0, px: 0.75, "& .MuiButton-startIcon": { mx: 0 } },
} as const;

/** Filled with the primary color while the panel is open, like the panel's title row. */
const openSx = {
  color: "primary.contrastText",
  borderColor: "primary.main",
  bgcolor: "primary.main",
  "&:hover": { bgcolor: "primary.dark", borderColor: "primary.dark" },
} as const;
