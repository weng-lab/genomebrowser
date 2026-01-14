import { FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";
import { FolderRuntimeConfig } from "../../types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
  sortedByAssayColumns,
  sortedByAssayGroupingModel,
  sortedByAssayLeafField,
} from "./columns";

export interface AssayToggleProps {
  updateConfig: (partial: Partial<FolderRuntimeConfig>) => void;
}

/**
 * Biosample-specific toolbar component that toggles between
 * sample-grouped and assay-grouped views.
 *
 * When toggled, it updates the folder's runtime config to switch:
 * - columns: Different column definitions for each view
 * - groupingModel: ["ontology", "displayname"] vs ["assay", "ontology", "displayname"]
 * - leafField: "assay" vs "id"
 */
export function AssayToggle({ updateConfig }: AssayToggleProps) {
  const [sortedByAssay, setSortedByAssay] = useState(false);

  const handleToggle = () => {
    const newValue = !sortedByAssay;
    setSortedByAssay(newValue);

    if (newValue) {
      // Switch to assay-grouped view
      updateConfig({
        columns: sortedByAssayColumns,
        groupingModel: sortedByAssayGroupingModel,
        leafField: sortedByAssayLeafField,
      });
    } else {
      // Switch back to default (sample-grouped) view
      updateConfig({
        columns: defaultColumns,
        groupingModel: defaultGroupingModel,
        leafField: defaultLeafField,
      });
    }
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
