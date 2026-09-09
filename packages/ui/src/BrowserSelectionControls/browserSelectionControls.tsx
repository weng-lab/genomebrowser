import ToggleButton from "@mui/material/ToggleButton";
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
      <ToggleButton value="pan" onClick={() => setMode("pan")} title="Pan (P)">
        Pan
      </ToggleButton>
      <ToggleButton
        value="zoom"
        onClick={() => setMode("zoom")}
        title="Select a region to zoom (Z or Shift-drag)"
      >
        Select zoom
      </ToggleButton>
      <ToggleButton
        value="highlight"
        onClick={() => setMode("highlight")}
        title="Select a region to highlight (H or Alt-Shift-drag)"
      >
        Highlight
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
