import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
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
  return (
    <Tooltip title={`${label} (${shortcut})`} placement={tooltipPlacement}>
      <IconButton
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${side}-panel`}
        aria-keyshortcuts={side === "left" ? "Control+b" : "Control+Alt+b"}
        onClick={onToggle}
      >
        <PanelToggleIcon side={side} open={open} />
      </IconButton>
    </Tooltip>
  );
}

/** A panel outline whose chevron points the way the panel will move when toggled. */
function PanelToggleIcon({ side, open }: { side: Side; open: boolean }) {
  const pointsLeft = side === "left" ? open : !open;
  return (
    <SvgIcon
      sx={{
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d={side === "left" ? "M9 3v18" : "M15 3v18"} />
      <path
        d={
          pointsLeft
            ? side === "left"
              ? "m16 15-3-3 3-3"
              : "m10 15-3-3 3-3"
            : side === "left"
              ? "m14 9 3 3-3 3"
              : "m8 9 3 3-3 3"
        }
      />
    </SvgIcon>
  );
}
