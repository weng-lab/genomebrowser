import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { FolderView } from "../../types";
import { BiosampleRowInfo } from "./types";

export interface BiosampleViewSelectorProps {
  views: FolderView<BiosampleRowInfo>[];
  activeViewId: string;
  onChange: (viewId: string) => void;
}

export function BiosampleViewSelector({
  views,
  activeViewId,
  onChange,
}: BiosampleViewSelectorProps) {
  return (
    <ToggleButtonGroup
      exclusive
      value={activeViewId}
      size="small"
      onChange={(_event, viewId: string | null) => {
        if (viewId) {
          onChange(viewId);
        }
      }}
    >
      {views.map((view) => (
        <ToggleButton key={view.id} value={view.id}>
          {view.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
