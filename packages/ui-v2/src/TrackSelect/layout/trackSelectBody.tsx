import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { SelectedByFolder } from "../catalog/catalogSelection";
import { CatalogGrid } from "../catalogGrid/catalogGrid";
import { FolderList } from "../folderList/folderList";
import type { TrackSelectFolder, TrackSelectView } from "../schema/folderSchema";
import { SelectedTracksTree } from "../selectedTracksTree/selectedTracksTree";
import type { TrackSelectScreen } from "../types";

type TrackSelectBodyProps = {
  folders: TrackSelectFolder[];
  screen: TrackSelectScreen;
  activeFolder: TrackSelectFolder | undefined;
  activeView: TrackSelectView | undefined;
  activeViewIdByFolder: Map<string, string>;
  selectedByFolder: SelectedByFolder;
  selectedTrackCount: number;
  onFolderSelect: (folderId: string) => void;
  onActiveFolderSelectionChange: (selectedIds: Set<string>) => void;
  onRemoveTrackIds: (trackIds: string[]) => void;
};

export function TrackSelectBody({
  folders,
  screen,
  activeFolder,
  activeView,
  activeViewIdByFolder,
  selectedByFolder,
  selectedTrackCount,
  onFolderSelect,
  onActiveFolderSelectionChange,
  onRemoveTrackIds,
}: TrackSelectBodyProps) {
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
          <FolderList folders={folders} onFolderSelect={onFolderSelect} />
        ) : (
          <CatalogGrid
            folder={activeFolder}
            view={activeView}
            selectedIds={getActiveFolderSelection(activeFolder, selectedByFolder)}
            onSelectionChange={onActiveFolderSelectionChange}
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
          onRemoveTrackIds={onRemoveTrackIds}
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
