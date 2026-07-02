import CardActionArea from "@mui/material/CardActionArea";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { TrackSelectFolder } from "../schema/folderSchema";

type FolderCardProps = {
  folder: TrackSelectFolder;
  onClick: () => void;
};

export function FolderCard({ folder, onClick }: FolderCardProps) {
  return (
    <Paper
      elevation={1}
      sx={{
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: 3,
          bgcolor: "action.hover",
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ display: "block", p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {folder.label}
        </Typography>
        {folder.description ? (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {folder.description}
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary">
          {folder.tracks.length.toLocaleString()} tracks available
        </Typography>
      </CardActionArea>
    </Paper>
  );
}
