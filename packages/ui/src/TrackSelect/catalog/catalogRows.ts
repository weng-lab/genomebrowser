import type { TrackSelectCatalog, TrackSelectTrack } from "../schema/catalogSchema";

export type CatalogGridRow = {
  id: string;
  title: string;
  type: string;
  track: TrackSelectTrack;
  // Metadata defines dynamic grid columns, so rows need a string index signature.
  [field: string]: unknown;
};

export type CatalogTrackEntry = Readonly<{
  catalogId: string;
  qualifiedTrackId: string;
  track: TrackSelectTrack;
}>;

export function getCatalogTrackId(catalogId: string, trackId: string) {
  return `${catalogId}::${trackId}`;
}

export function getCatalogRows(catalog: Pick<TrackSelectCatalog, "id" | "tracks">) {
  return catalog.tracks.map(
    (track): CatalogGridRow => ({
      // Keep metadata first so reserved catalog fields below cannot be clobbered.
      ...track.metadata,
      id: getCatalogTrackId(catalog.id, track.id),
      title: track.title,
      type: track.type,
      track,
    }),
  );
}

export function getCatalogTrackIds(catalog: Pick<TrackSelectCatalog, "id" | "tracks">) {
  return new Set(catalog.tracks.map((track) => getCatalogTrackId(catalog.id, track.id)));
}

export function getCatalogTrackById(trackCatalogs: TrackSelectCatalog[]) {
  const tracksById = new Map<string, CatalogTrackEntry>();

  for (const catalog of trackCatalogs) {
    for (const track of catalog.tracks) {
      const qualifiedTrackId = getCatalogTrackId(catalog.id, track.id);
      tracksById.set(qualifiedTrackId, {
        catalogId: catalog.id,
        qualifiedTrackId,
        track,
      });
    }
  }

  return tracksById;
}

export function assertUniqueCatalogTrackIds(trackCatalogs: TrackSelectCatalog[]) {
  const catalogIds = new Set<string>();
  const seen = new Set<string>();

  for (const catalog of trackCatalogs) {
    if (catalogIds.has(catalog.id)) {
      throw new Error(`Duplicate track catalog id: ${catalog.id}`);
    }
    catalogIds.add(catalog.id);

    for (const track of catalog.tracks) {
      const id = getCatalogTrackId(catalog.id, track.id);
      if (seen.has(id)) throw new Error(`Duplicate catalog track id: ${id}`);
      seen.add(id);
    }
  }
}
