import { FormControlLabel, Switch } from "@mui/material";
import { FolderRuntimeConfig } from "../../types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
  sortedByAssayColumns,
  sortedByAssayGroupingModel,
  sortedByAssayLeafField,
} from "./columns";
import { buildTreeView, buildSortedAssayTreeView } from "./treeBuilder";

export interface AssayToggleProps {
  updateConfig: (partial: Partial<FolderRuntimeConfig>) => void;
  folderId: string;
  label: string;
  config: FolderRuntimeConfig;
}

/**
 * Biosample-specific toolbar component that toggles between
 * sample-grouped and assay-grouped views.
 *
 * When toggled, it updates the folder's runtime config to switch:
 * - columns: Different column definitions for each view
 * - groupingModel: ["ontology", "displayName"] vs ["assay", "ontology"]
 * - leafField: "assay" vs "displayName"
 * - buildTree: Different tree builder function
 */
export function AssayToggle({
  updateConfig,
  folderId,
  label,
  config,
}: AssayToggleProps) {
  // Derive toggle state from current config's leafField
  const sortedByAssay = config.leafField === sortedByAssayLeafField;

  const handleToggle = () => {
    const newValue = !sortedByAssay;

    if (newValue) {
      // Switch to assay-grouped view
      updateConfig({
        columns: sortedByAssayColumns,
        groupingModel: sortedByAssayGroupingModel,
        leafField: sortedByAssayLeafField,
        buildTree: (selectedIds, rowById) =>
          buildSortedAssayTreeView(selectedIds, rowById, label, folderId),
      });
    } else {
      // Switch back to default (sample-grouped) view
      updateConfig({
        columns: defaultColumns,
        groupingModel: defaultGroupingModel,
        leafField: defaultLeafField,
        buildTree: (selectedIds, rowById) =>
          buildTreeView(selectedIds, rowById, label, folderId),
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
