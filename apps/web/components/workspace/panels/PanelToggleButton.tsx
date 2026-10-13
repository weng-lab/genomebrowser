import IconButton from "@mui/material/IconButton";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import Tooltip from "@mui/material/Tooltip";

type Side = "left" | "right";

type PanelToggleButtonProps = {
  side: Side;
  open: boolean;
  onToggle: () => void;
  tooltipPlacement: "right" | "bottom";
};

/** Shows or hides the side panel with id `${side}-panel`. */
export function PanelToggleButton({
  side,
  open,
  onToggle,
  tooltipPlacement,
}: PanelToggleButtonProps) {
  const label = `${open ? "Hide" : "Show"} ${side} panel`;
  const shortcut = side === "left" ? "Ctrl+B" : "Ctrl+Alt+B";
  const pointsLeft = side === "left" ? open : !open;
  return (
    <Tooltip title={`${label} (${shortcut})`} placement={tooltipPlacement}>
      <IconButton
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${side}-panel`}
        aria-keyshortcuts={side === "left" ? "Control+b" : "Control+Alt+b"}
        onClick={onToggle}
      >
        <MenuOpenIcon sx={{ transform: pointsLeft ? "none" : "scaleX(-1)" }} />
      </IconButton>
    </Tooltip>
  );
}
