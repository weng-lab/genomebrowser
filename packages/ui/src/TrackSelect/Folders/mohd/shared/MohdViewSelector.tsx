import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { FolderView } from "../../types";
import { MohdRowInfo } from "./types";

export interface MohdViewSelectorProps {
  views: FolderView<MohdRowInfo>[];
  activeViewId: string;
  onChange: (viewId: string) => void;
}

export function MohdViewSelector({
  views,
  activeViewId,
  onChange,
}: MohdViewSelectorProps) {
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
