import type { TrackSelectFolder, TrackSelectTrack } from "../schema/folderSchema";

export type CatalogGridRow = {
  id: string;
  title: string;
  type: string;
  track: TrackSelectTrack;
  // Metadata defines dynamic grid columns, so rows need a string index signature.
  [field: string]: unknown;
};

export function getCatalogTrackId(folderId: string, trackId: string) {
  return `${folderId}::${trackId}`;
}

export function getCatalogRows(folder: Pick<TrackSelectFolder, "id" | "tracks">) {
  return folder.tracks.map((track): CatalogGridRow => ({
    // Keep metadata first so reserved catalog fields below cannot be clobbered.
    ...track.metadata,
    id: getCatalogTrackId(folder.id, track.config.id),
    title: track.config.title,
    type: track.type,
    track,
  }));
}

export function getCatalogTrackIds(folder: Pick<TrackSelectFolder, "id" | "tracks">) {
  return new Set(
    folder.tracks.map((track) => getCatalogTrackId(folder.id, track.config.id)),
  );
}

export function getCatalogTrackById(folders: TrackSelectFolder[]) {
  const tracksById = new Map<string, TrackSelectTrack>();

  for (const folder of folders) {
    for (const track of folder.tracks) {
      tracksById.set(getCatalogTrackId(folder.id, track.config.id), track);
    }
  }

  return tracksById;
}

export function assertUniqueCatalogTrackIds(folders: TrackSelectFolder[]) {
  const folderIds = new Set<string>();
  const seen = new Set<string>();

  for (const folder of folders) {
    if (folderIds.has(folder.id)) {
      throw new Error(`Duplicate catalog folder id: ${folder.id}`);
    }
    folderIds.add(folder.id);

    for (const track of folder.tracks) {
      const id = getCatalogTrackId(folder.id, track.config.id);
      if (seen.has(id)) throw new Error(`Duplicate catalog track id: ${id}`);
      seen.add(id);
    }
  }
}
