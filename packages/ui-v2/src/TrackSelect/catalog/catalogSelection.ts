import type { TrackSelectCatalog, TrackSelectView } from "../schema/catalogSchema";
import { getOrderedSelectedRows } from "./catalogOrder";
import { getCatalogTrackId, getCatalogTrackIds } from "./catalogRows";
import type { CatalogStoreTrack } from "./catalogTypes";

export type SelectedByCatalog = Map<string, Set<string>>;

function createEmptySelection(trackCatalogs: TrackSelectCatalog[]) {
  return new Map(trackCatalogs.map((catalog) => [catalog.id, new Set<string>()]));
}

export function createOrderedSelectionFromTracks(
  trackCatalogs: TrackSelectCatalog[],
  tracks: CatalogStoreTrack[],
) {
  const catalogTrackIds = new Set(
    trackCatalogs.flatMap((catalog) =>
      catalog.tracks.map((track) => getCatalogTrackId(catalog.id, track.id)),
    ),
  );
  return tracks.flatMap((track) => (catalogTrackIds.has(track.base.id) ? [track.base.id] : []));
}

export function createSelectionByCatalog(
  trackCatalogs: TrackSelectCatalog[],
  selectedTrackIds: readonly string[],
) {
  const selectedByCatalog = createEmptySelection(trackCatalogs);

  for (const catalog of trackCatalogs) {
    const catalogTrackIds = getCatalogTrackIds(catalog);
    const selectedIds = selectedByCatalog.get(catalog.id)!;
    for (const id of selectedTrackIds) {
      if (catalogTrackIds.has(id)) selectedIds.add(id);
    }
  }

  return selectedByCatalog;
}

export function setOrderedCatalogSelection({
  selectedTrackIds,
  catalog,
  view,
  selectedIds,
}: {
  selectedTrackIds: readonly string[];
  catalog: TrackSelectCatalog;
  view: TrackSelectView;
  selectedIds: Set<string>;
}) {
  const catalogTrackIds = getCatalogTrackIds(catalog);
  const next = selectedTrackIds.filter((id) => !catalogTrackIds.has(id) || selectedIds.has(id));
  const retainedIds = new Set(next);
  const additions = getOrderedSelectedRows(catalog, view, selectedIds)
    .map((row) => row.id)
    .filter((id) => !retainedIds.has(id));

  return [...next, ...additions];
}

export function clearOrderedSelection(
  selectedTrackIds: readonly string[],
  catalog?: TrackSelectCatalog,
) {
  if (!catalog) return [];
  const catalogTrackIds = getCatalogTrackIds(catalog);
  return selectedTrackIds.filter((id) => !catalogTrackIds.has(id));
}

export function removeOrderedTrackIds(
  selectedTrackIds: readonly string[],
  trackIds: readonly string[],
) {
  const idsToRemove = new Set(trackIds);
  return selectedTrackIds.filter((id) => !idsToRemove.has(id));
}
