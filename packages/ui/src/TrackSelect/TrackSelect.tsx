import { Box, Stack } from "@mui/material";
import { create } from "zustand";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import { SelectionAction, SelectionState } from "./types";

const useSelectionStore = create<SelectionState & SelectionAction>((set) => ({
  selectedIds: new Set<string>(),
  setSelected: (ids: Set<string>) =>
    set(() => ({
      selectedIds: new Set(ids),
    })),
  remove: (removedIds: Set<string>) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      removedIds.forEach((id) => {
        next.delete(id);
      });
      return { selectedIds: next };
    }),
  clear: () => set(() => ({ selectedIds: new Set<string>() })),
}));

export default function TrackSelect() {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const remove = useSelectionStore((s) => s.remove);

  console.log("trackSelect selectedIds: ", selectedIds);

  return (
    <Box width="fit-content">
      <Stack direction="row" spacing={2}>
        <DataGridWrapper selectedIds={selectedIds} setSelected={setSelected} />
        <TreeViewWrapper selectedIds={selectedIds} remove={remove} />
      </Stack>
    </Box>
  );
}

// const [sortedAssay, setSortedAssay] = useState(false);
// const [filteredRows, setFilteredRows] = useState(rows);
// const handleToggle = () => {
//   setSortedAssay(!sortedAssay);
// };
// const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//   if (e.target.value === "") {
//     setFilteredRows(rows);
//     return;
//   }
//   const props: SearchTracksProps = {
//     jsonStructure: "tracks",
//     query: e.target.value,
//     keyWeightMap: [
//       "displayname",
//       "ontology",
//       "lifeStage",
//       "sampleType",
//       "type",
//       "experimentAccession",
//       "fileAccession",
//     ],
//     limit: 50,
//   };
//   const res = searchTracks(props);
//   setFilteredRows(res.map(flattenIntoRow));
// };

{
  /* <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
  <TextField
    id="outlined-suffix-shrink"
    label="Search"
    variant="outlined"
    onChange={handleSearch}
    sx={{ width: "250px" }}
  />
  <FormControlLabel
    sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}
    value="Sort by assay"
    control={<Switch color="primary" onChange={handleToggle} />}
    label="Sort by assay"
    labelPlacement="end"
  />
</Box> */
}

{
  /* <Box sx={{ justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => clear()}
            sx={{ mt: 2, justifyContent: "flex-end" }}
          >
            Clear Selection
          </Button>
      </Box> */
}
