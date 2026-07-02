import type { TrackSelectFolder } from "../schema/folderSchema";
import { getCatalogTrackId } from "./catalogRows";
import type { CatalogStoreTrack } from "./catalogTypes";

export type SelectedByFolder = Map<string, Set<string>>;

function createEmptySelection(folders: TrackSelectFolder[]) {
  return new Map(folders.map((folder) => [folder.id, new Set<string>()]));
}

export function createSelectionFromTracks(
  folders: TrackSelectFolder[],
  tracks: CatalogStoreTrack[],
) {
  const selectedByFolder = createEmptySelection(folders);
  const storeTrackIds = new Set(tracks.map((track) => track.base.id));

  for (const folder of folders) {
    const selectedIds = selectedByFolder.get(folder.id)!;
    for (const track of folder.tracks) {
      const trackId = getCatalogTrackId(folder.id, track.config.id);
      if (storeTrackIds.has(trackId)) selectedIds.add(trackId);
    }
  }

  return selectedByFolder;
}

export function countSelectedTracks(selectedByFolder: SelectedByFolder) {
  let count = 0;
  for (const selectedIds of selectedByFolder.values()) count += selectedIds.size;
  return count;
}

function cloneSelection(selectedByFolder: SelectedByFolder) {
  return new Map(
    Array.from(selectedByFolder, ([folderId, selectedIds]) => [
      folderId,
      new Set(selectedIds),
    ]),
  );
}

export function setFolderSelection(
  selectedByFolder: SelectedByFolder,
  folderId: string,
  selectedIds: Set<string>,
) {
  const next = cloneSelection(selectedByFolder);
  next.set(folderId, new Set(selectedIds));
  return next;
}

export function clearSelection(
  folders: TrackSelectFolder[],
  selectedByFolder: SelectedByFolder,
  folderId?: string,
) {
  const next = cloneSelection(selectedByFolder);

  if (folderId) {
    next.set(folderId, new Set<string>());
    return next;
  }

  for (const folder of folders) next.set(folder.id, new Set<string>());
  return next;
}

export function removeTrackIdsFromSelection(
  selectedByFolder: SelectedByFolder,
  trackIds: string[],
) {
  const idsToRemove = new Set(trackIds);
  const next = cloneSelection(selectedByFolder);

  for (const [folderId, selectedIds] of next) {
    next.set(
      folderId,
      new Set(Array.from(selectedIds).filter((id) => !idsToRemove.has(id))),
    );
  }

  return next;
}
