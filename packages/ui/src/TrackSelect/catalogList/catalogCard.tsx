import CardActionArea from "@mui/material/CardActionArea";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { TrackSelectCatalog } from "../schema/catalogSchema";

type CatalogCardProps = {
  catalog: TrackSelectCatalog;
  onClick: () => void;
};

export function CatalogCard({ catalog, onClick }: CatalogCardProps) {
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
          {catalog.label}
        </Typography>
        {catalog.description ? (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {catalog.description}
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary">
          {catalog.tracks.length.toLocaleString()} tracks available
        </Typography>
      </CardActionArea>
    </Paper>
  );
}
