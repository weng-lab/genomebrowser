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
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      sx={{
        p: 3,
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: 3,
          bgcolor: "action.hover",
        },
        "&:focus": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
      }}
    >
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
    </Paper>
  );
}
