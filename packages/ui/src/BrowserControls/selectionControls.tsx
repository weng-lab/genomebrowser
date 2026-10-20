import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import HighlightIcon from "@mui/icons-material/Highlight";
import PanToolIcon from "@mui/icons-material/PanTool";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";

export type SelectionControlsProps = {
  browserStore: BrowserStoreInstance;
  disabled?: boolean;
};

export function SelectionControls({ browserStore, disabled = false }: SelectionControlsProps) {
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
      <Tooltip title="Pan: drag to move the region" describeChild disableHoverListener={disabled}>
        <ToggleButton value="pan" aria-label="Pan" onClick={() => setMode("pan")}>
          <PanToolIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip
        title="Zoom: drag to select a region to zoom into"
        describeChild
        disableHoverListener={disabled}
      >
        <ToggleButton value="zoom" aria-label="Zoom" onClick={() => setMode("zoom")}>
          <ZoomInIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip
        title="Highlight: drag to highlight a region"
        describeChild
        disableHoverListener={disabled}
      >
        <ToggleButton value="highlight" aria-label="Highlight" onClick={() => setMode("highlight")}>
          <HighlightIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
