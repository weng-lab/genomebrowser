import { Box, Stack, Typography } from "@mui/material";
import { FolderDefinition } from "../folders/types";
import { FolderCard } from "../FolderCard";

export interface FolderListProps {
  folders: FolderDefinition[];
  onFolderSelect: (folderId: string) => void;
}

export function FolderList({ folders, onFolderSelect }: FolderListProps) {
  if (folders.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No folders available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Stack spacing={2}>
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            onClick={() => onFolderSelect(folder.id)}
          />
        ))}
      </Stack>
    </Box>
  );
}
