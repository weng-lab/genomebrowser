import type { TrackSelectCatalog, TrackSelectTrack } from "../schema/catalogSchema";
import type { SelectedByCatalog } from "./catalogSelection";
import { getCatalogTrackById } from "./catalogRows";
import { getOrderedSelectedRows } from "./catalogOrder";
import type { CatalogStoreTrack } from "./catalogTypes";
import { getActiveView } from "./catalogViews";

export function getSelectionDiff({
  trackCatalogs,
  tracks,
  selectedByCatalog,
  activeViewIdByCatalog,
}: {
  trackCatalogs: TrackSelectCatalog[];
  tracks: CatalogStoreTrack[];
  selectedByCatalog: SelectedByCatalog;
  activeViewIdByCatalog: Map<string, string>;
}) {
  const catalogTrackById = getCatalogTrackById(trackCatalogs);
  const currentCatalogTrackIds = new Set<string>();
  for (const track of tracks) {
    if (catalogTrackById.has(track.base.id)) {
      currentCatalogTrackIds.add(track.base.id);
    }
  }
  const nextSelectedIds = new Set<string>();
  const tracksToAdd: { id: string; track: TrackSelectTrack }[] = [];

  for (const catalog of trackCatalogs) {
    const selectedIds = selectedByCatalog.get(catalog.id) ?? new Set<string>();
    for (const id of selectedIds) nextSelectedIds.add(id);

    const activeView = getActiveView(catalog, activeViewIdByCatalog);
    for (const row of getOrderedSelectedRows(catalog, activeView, selectedIds)) {
      if (currentCatalogTrackIds.has(row.id)) continue;
      tracksToAdd.push({ id: row.id, track: row.track });
    }
  }

  const idsToRemove = Array.from(currentCatalogTrackIds).filter((id) => !nextSelectedIds.has(id));

  return { idsToRemove, tracksToAdd };
}
