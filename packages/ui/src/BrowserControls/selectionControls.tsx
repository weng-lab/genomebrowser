import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import PanToolIcon from "@mui/icons-material/PanTool";
import SearchIcon from "@mui/icons-material/Search";
import HighlightIcon from "@mui/icons-material/Highlight";
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
      <Tooltip title="Pan" describeChild disableHoverListener={disabled}>
        <ToggleButton value="pan" aria-label="Pan" onClick={() => setMode("pan")}>
          <PanToolIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Zoom" describeChild disableHoverListener={disabled}>
        <ToggleButton value="zoom" aria-label="Zoom" onClick={() => setMode("zoom")}>
          <SearchIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Highlight" describeChild disableHoverListener={disabled}>
        <ToggleButton value="highlight" aria-label="Highlight" onClick={() => setMode("highlight")}>
          <HighlightIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
