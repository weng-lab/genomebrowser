import { DataGridPremium, GridRowSelectionModel } from "@mui/x-data-grid-premium";
import { rows, columns } from './consts';
import { 
  Box, 
  Typography,
  Paper
} from "@mui/material";
import { DataGridWrapperProps } from "./types";

export function DataGridWrapper({selectedIds, setSelected}: DataGridWrapperProps) {
    console.log("selectedIds datagrid: ", selectedIds);

    const handleSelection = (newSelection: GridRowSelectionModel) => {
        const idsSet = (newSelection && (newSelection as any).ids) ?? new Set<string>();
        setSelected(idsSet);
        console.log("after handleSelection: ", selectedIds)
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
              rowGroupingModel={["ontology", "assay"]} // removing sortedAssay for simplicity
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
    )
}