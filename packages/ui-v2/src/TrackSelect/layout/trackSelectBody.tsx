import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { SelectedByFolder } from "../catalog/catalogSelection";
import { CatalogGrid } from "../catalogGrid/catalogGrid";
import { FolderList } from "../folderList/folderList";
import type { TrackSelectFolder } from "../schema/folderSchema";
import { SelectedTracksTree } from "../selectedTracksTree/selectedTracksTree";
import { useTrackSelect } from "../session/trackSelectContext";

export function TrackSelectBody() {
  const { state, actions } = useTrackSelect();
  const {
    folders,
    screen,
    activeFolder,
    activeView,
    activeViewIdByFolder,
    selectedByFolder,
    selectedTrackCount,
  } = state;

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ width: "100%" }}
    >
      <Box
        sx={{
          flex: { xs: "none", md: 3 },
          minWidth: 0,
          width: { xs: "100%", md: "auto" },
        }}
      >
        {screen === "folder-list" ? (
          <FolderList folders={folders} onFolderSelect={actions.selectFolder} />
        ) : (
          <CatalogGrid
            folder={activeFolder}
            view={activeView}
            selectedIds={getActiveFolderSelection(
              activeFolder,
              selectedByFolder,
            )}
            onSelectionChange={actions.selectActiveFolderTracks}
          />
        )}
      </Box>
      <Box
        sx={{
          flex: { xs: "none", md: 2 },
          minWidth: 0,
          width: { xs: "100%", md: "auto" },
        }}
      >
        <SelectedTracksTree
          folders={folders}
          selectedByFolder={selectedByFolder}
          activeViewIdByFolder={activeViewIdByFolder}
          selectedCount={selectedTrackCount}
          onRemoveTrackIds={actions.removeSelectedTrackIds}
        />
      </Box>
    </Stack>
  );
}

function getActiveFolderSelection(
  activeFolder: TrackSelectFolder | undefined,
  selectedByFolder: SelectedByFolder,
) {
  if (!activeFolder) return new Set<string>();
  return selectedByFolder.get(activeFolder.id) ?? new Set<string>();
}
