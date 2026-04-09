import { FormControlLabel, Switch } from "@mui/material";
import { FolderView } from "../../types";
import { BiosampleRowInfo } from "./types";

export interface AssayToggleProps {
  views: FolderView<BiosampleRowInfo>[];
  activeViewId: string;
  onChange: (viewId: string) => void;
}

/**
 * Biosample-specific view selector that toggles between
 * the default sample-grouped view and the assay-grouped view.
 */
export function AssayToggle({
  views,
  activeViewId,
  onChange,
}: AssayToggleProps) {
  const defaultView = views[0];
  const assayView = views[1];

  if (!defaultView || !assayView) {
    return null;
  }

  const sortedByAssay = activeViewId === assayView.id;

  const handleToggle = () => {
    onChange(sortedByAssay ? defaultView.id : assayView.id);
  };

  return (
    <FormControlLabel
      sx={{ display: "flex", justifyContent: "flex-end" }}
      value="Sort by assay"
      control={
        <Switch
          color="primary"
          checked={sortedByAssay}
          onChange={handleToggle}
        />
      }
      label="Sort by assay"
      labelPlacement="end"
    />
  );
}
