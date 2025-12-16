import { Box, Paper, Typography } from "@mui/material";
import {
  DataGridPremium,
  GridRowSelectionModel,
} from "@mui/x-data-grid-premium";
import { columns, rows } from "../consts";
import { DataGridWrapperProps } from "../types";

export function DataGridWrapper({
  selectedIds,
  setSelected,
  sortedAssay
}: DataGridWrapperProps) {
  const groupingModel = sortedAssay ? ["assay", "ontology"] : ["ontology", "assay"];
  const handleSelection = (newSelection: GridRowSelectionModel) => {
    const idsSet =
      (newSelection && (newSelection as any).ids) ?? new Set<string>();
    setSelected(idsSet);
  };

  return (
    <Paper>
      <Box sx={{ height: "500px", width: "1000px", overflow: "auto" }}>
        <Typography>
          <Box sx={{ fontWeight: "bold", padding: 2 }}>
            {rows.length} available tracks
          </Box>
        </Typography>
        <DataGridPremium
          rows={rows} // using rows instead of filteredRows rn for simplicity
          columns={columns}
          getRowId={(row) => row.experimentAccession}
          rowGroupingModel={groupingModel}
          groupingColDef={{ leafField: "displayname", display: "flex" }}
          columnVisibilityModel={{ displayname: false }}
          onRowSelectionModelChange={handleSelection}
          rowSelectionModel={{ type: "include", ids: selectedIds }}
          sx={{ ml: 2, display: "flex" }}
          checkboxSelection
          autosizeOnMount
          pagination
        />
      </Box>
    </Paper>
  );
}
