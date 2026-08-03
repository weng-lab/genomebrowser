import CardActionArea from "@mui/material/CardActionArea";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { TrackSelectCollection } from "../schema/collectionSchema";

type CollectionCardProps = {
  collection: TrackSelectCollection;
  onClick: () => void;
};

export function CollectionCard({ collection, onClick }: CollectionCardProps) {
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
          {collection.label}
        </Typography>
        {collection.description ? (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {collection.description}
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary">
          {collection.tracks.length.toLocaleString()} tracks available
        </Typography>
      </CardActionArea>
    </Paper>
  );
}
