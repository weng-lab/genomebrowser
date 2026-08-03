import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import type { TrackSelectCollection } from "../schema/collectionSchema";
import { trackSelectPanelHeight } from "../trackSelectConstants";
import { TrackSelectEmptyPanel } from "../trackSelectEmptyPanel";
import { CollectionCard } from "./collectionCard";

type CollectionListProps = {
  collections: TrackSelectCollection[];
  onCollectionSelect: (collectionId: string) => void;
};

export function CollectionList({ collections, onCollectionSelect }: CollectionListProps) {
  if (collections.length === 0) {
    return <TrackSelectEmptyPanel>No track collections available</TrackSelectEmptyPanel>;
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
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onClick={() => onCollectionSelect(collection.id)}
          />
        ))}
      </Stack>
    </Paper>
  );
}
