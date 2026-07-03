import type { TrackSelectCatalog } from "../schema/catalogSchema";
import { getCatalogTrackId } from "./catalogRows";
import type { CatalogStoreTrack } from "./catalogTypes";

export type SelectedByCatalog = Map<string, Set<string>>;

function createEmptySelection(trackCatalogs: TrackSelectCatalog[]) {
  return new Map(trackCatalogs.map((catalog) => [catalog.id, new Set<string>()]));
}

export function createSelectionFromTracks(
  trackCatalogs: TrackSelectCatalog[],
  tracks: CatalogStoreTrack[],
) {
  const selectedByCatalog = createEmptySelection(trackCatalogs);
  const storeTrackIds = new Set(tracks.map((track) => track.base.id));

  for (const catalog of trackCatalogs) {
    const selectedIds = selectedByCatalog.get(catalog.id)!;
    for (const track of catalog.tracks) {
      const trackId = getCatalogTrackId(catalog.id, track.config.id);
      if (storeTrackIds.has(trackId)) selectedIds.add(trackId);
    }
  }

  return selectedByCatalog;
}

export function countSelectedTracks(selectedByCatalog: SelectedByCatalog) {
  let count = 0;
  for (const selectedIds of selectedByCatalog.values()) count += selectedIds.size;
  return count;
}

function cloneSelection(selectedByCatalog: SelectedByCatalog) {
  return new Map(
    Array.from(selectedByCatalog, ([catalogId, selectedIds]) => [catalogId, new Set(selectedIds)]),
  );
}

export function setCatalogSelection(
  selectedByCatalog: SelectedByCatalog,
  catalogId: string,
  selectedIds: Set<string>,
) {
  const next = cloneSelection(selectedByCatalog);
  next.set(catalogId, new Set(selectedIds));
  return next;
}

export function clearSelection(
  trackCatalogs: TrackSelectCatalog[],
  selectedByCatalog: SelectedByCatalog,
  catalogId?: string,
) {
  const next = cloneSelection(selectedByCatalog);

  if (catalogId) {
    next.set(catalogId, new Set<string>());
    return next;
  }

  for (const catalog of trackCatalogs) next.set(catalog.id, new Set<string>());
  return next;
}

export function removeTrackIdsFromSelection(
  selectedByCatalog: SelectedByCatalog,
  trackIds: string[],
) {
  const idsToRemove = new Set(trackIds);
  const next = cloneSelection(selectedByCatalog);

  for (const [catalogId, selectedIds] of next) {
    next.set(catalogId, new Set(Array.from(selectedIds).filter((id) => !idsToRemove.has(id))));
  }

  return next;
}
