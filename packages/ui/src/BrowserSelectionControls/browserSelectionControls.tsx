import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";

export type BrowserSelectionControlsProps = {
  browserStore: BrowserStoreInstance;
  disabled?: boolean;
};

export function BrowserSelectionControls({
  browserStore,
  disabled = false,
}: BrowserSelectionControlsProps) {
  const useBrowserStore = browserStore;
  const mode = useBrowserStore((state) => state.selectionMode);
  const setMode = useBrowserStore((state) => state.setSelectionMode);
  return (
    <ToggleButtonGroup
      aria-label="Region interaction"
      exclusive
      size="small"
      value={mode}
      disabled={disabled}
    >
      <Tooltip title="Drag to pan the region" describeChild disableHoverListener={disabled}>
        <ToggleButton value="pan" onClick={() => setMode("pan")}>
          Pan
        </ToggleButton>
      </Tooltip>
      <Tooltip
        title="Drag to select a region to zoom into"
        describeChild
        disableHoverListener={disabled}
      >
        <ToggleButton value="zoom" onClick={() => setMode("zoom")}>
          Zoom
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Drag to highlight a region" describeChild disableHoverListener={disabled}>
        <ToggleButton value="highlight" onClick={() => setMode("highlight")}>
          Highlight
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
