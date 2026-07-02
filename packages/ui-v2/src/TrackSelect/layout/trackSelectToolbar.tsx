import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useTrackSelect } from "../session/trackSelectContext";

export function TrackSelectToolbar() {
  const { state, actions } = useTrackSelect();
  const { folders, screen, activeFolder, activeView } = state;

  function handleViewChange(event: SelectChangeEvent) {
    actions.selectView(event.target.value);
  }

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 2 }}
    >
      {screen === "folder-detail" && folders.length > 1 ? (
        <Button size="small" onClick={actions.backToFolders}>
          Back to Folders
        </Button>
      ) : (
        <Box />
      )}
      {screen === "folder-detail" && activeFolder && activeView ? (
        <Select
          size="small"
          value={activeView.id}
          onChange={handleViewChange}
          sx={{ minWidth: 180 }}
        >
          {activeFolder.views.map((view) => (
            <MenuItem key={view.id} value={view.id}>
              {view.label}
            </MenuItem>
          ))}
        </Select>
      ) : null}
    </Box>
  );
}
