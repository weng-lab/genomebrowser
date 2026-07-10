import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { TrackSelectColumnOverrides } from "../catalog/catalogColumns";
import type { SelectedByCatalog } from "../catalog/catalogSelection";
import { CatalogGrid } from "../catalog/catalogGrid";
import { CatalogList } from "../catalogList/catalogList";
import type { TrackSelectCatalog } from "../schema/catalogSchema";
import { SelectedTracksTree } from "../selectedTracksTree/selectedTracksTree";
import { useTrackSelect } from "../session/trackSelectContext";

export function TrackSelectBody({
  columnOverrides,
}: {
  columnOverrides?: TrackSelectColumnOverrides;
}) {
  const { state, actions } = useTrackSelect();
  const {
    trackCatalogs,
    screen,
    activeCatalog,
    activeView,
    activeViewIdByCatalog,
    selectedByCatalog,
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
        {screen === "catalog-list" ? (
          <CatalogList catalogs={trackCatalogs} onCatalogSelect={actions.selectCatalog} />
        ) : (
          <CatalogGrid
            catalog={activeCatalog}
            view={activeView}
            selectedIds={getActiveCatalogSelection(activeCatalog, selectedByCatalog)}
            onSelectionChange={actions.selectActiveCatalogTracks}
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
          trackCatalogs={trackCatalogs}
          selectedByCatalog={selectedByCatalog}
          activeViewIdByCatalog={activeViewIdByCatalog}
          selectedCount={selectedTrackCount}
          onRemoveTrackIds={actions.removeSelectedTrackIds}
        />
      </Box>
    </Stack>
  );
}

function getActiveCatalogSelection(
  activeCatalog: TrackSelectCatalog | undefined,
  selectedByCatalog: SelectedByCatalog,
) {
  if (!activeCatalog) return new Set<string>();
  return selectedByCatalog.get(activeCatalog.id) ?? new Set<string>();
}
