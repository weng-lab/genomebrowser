import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import type { TrackSelectFolder } from "../schema/folderSchema";
import { trackSelectPanelHeight } from "../trackSelectConstants";
import { TrackSelectEmptyPanel } from "../trackSelectEmptyPanel";
import { FolderCard } from "./folderCard";

type FolderListProps = {
  folders: TrackSelectFolder[];
  onFolderSelect: (folderId: string) => void;
};

export function FolderList({ folders, onFolderSelect }: FolderListProps) {
  if (folders.length === 0) {
    return <TrackSelectEmptyPanel>No folders available</TrackSelectEmptyPanel>;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        height: trackSelectPanelHeight,
        overflow: "auto",
        borderWidth: 2,
      }}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            onClick={() => onFolderSelect(folder.id)}
          />
        ))}
      </Stack>
    </Paper>
  );
}
