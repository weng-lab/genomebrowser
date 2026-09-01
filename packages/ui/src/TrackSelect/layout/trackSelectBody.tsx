import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { TrackSelectColumnOverrides } from "../collection/collectionColumns";
import type { TrackSelectCollectionRecord } from "../collection/collectionCompilation";
import type { SelectedByCollection } from "../collection/collectionSelection";
import { CollectionGrid } from "../collection/collectionGrid";
import { CollectionList } from "../collectionList/collectionList";
import { SelectedTracksTree } from "../selectedTracksTree/selectedTracksTree";
import { useTrackSelect } from "../session/trackSelectContext";

export function TrackSelectBody({
  columnOverrides,
}: {
  columnOverrides?: TrackSelectColumnOverrides;
}) {
  const { state, actions } = useTrackSelect();
  const {
    collections,
    screen,
    activeCollection,
    activeView,
    activeViewIdByCollection,
    selectedByCollection,
    selectedTrackCount,
  } = state;

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ width: "100%" }}>
      <Box
        sx={{
          flex: { xs: "none", md: 3 },
          minWidth: 0,
          width: { xs: "100%", md: "auto" },
        }}
      >
        {screen === "collection-list" ? (
          <CollectionList collections={collections} onCollectionSelect={actions.selectCollection} />
        ) : (
          <CollectionGrid
            collection={activeCollection}
            view={activeView}
            selectedIds={getActiveCollectionSelection(activeCollection, selectedByCollection)}
            onSelectionChange={actions.selectActiveCollectionTracks}
            columnOverrides={columnOverrides}
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
          collections={collections}
          selectedByCollection={selectedByCollection}
          activeViewIdByCollection={activeViewIdByCollection}
          selectedCount={selectedTrackCount}
          onRemoveTrackIds={actions.removeSelectedTrackIds}
        />
      </Box>
    </Stack>
  );
}

function getActiveCollectionSelection(
  activeCollection: TrackSelectCollectionRecord | undefined,
  selectedByCollection: SelectedByCollection,
) {
  if (!activeCollection) return new Set<string>();
  return selectedByCollection.get(activeCollection.id) ?? new Set<string>();
}
