import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import type { TrackSelectFolder, TrackSelectView } from "../schema/folderSchema";
import type { TrackSelectScreen } from "../types";

type TrackSelectToolbarProps = {
  folders: TrackSelectFolder[];
  screen: TrackSelectScreen;
  activeFolder: TrackSelectFolder | undefined;
  activeView: TrackSelectView | undefined;
  onBackToFolders: () => void;
  onViewSelect: (viewId: string) => void;
};

export function TrackSelectToolbar({
  folders,
  screen,
  activeFolder,
  activeView,
  onBackToFolders,
  onViewSelect,
}: TrackSelectToolbarProps) {
  function handleViewChange(event: SelectChangeEvent) {
    onViewSelect(event.target.value);
  }

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 2 }}
    >
      {screen === "folder-detail" && folders.length > 1 ? (
        <Button size="small" onClick={onBackToFolders}>
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
