import { TrackStoreInstance } from "@weng-lab/genomebrowser";
import { Assembly, FolderDefinition } from "./Folders/types";

export const cloneSelectionMap = (selection: Map<string, Set<string>>) => {
  const map = new Map<string, Set<string>>();
  selection.forEach((ids, folderId) => {
    map.set(folderId, new Set(ids));
  });
  return map;
};

export const buildManagedTracks = (
  folders: FolderDefinition[],
  selectedByFolder: Map<string, Set<string>>,
  assembly: Assembly,
) => {
  return folders.flatMap((folder) => {
    const selectedIds = selectedByFolder.get(folder.id) ?? new Set<string>();
    return Array.from(selectedIds).flatMap((id) => {
      const row = folder.rowById.get(id);
      if (!row) {
        return [];
      }

      const track = folder.createTrack(row, { assembly });
      return track ? [track] : [];
    });
  });
};

export const replaceManagedTracksInStore = ({
  assembly,
  folders,
  selectedByFolder,
  trackStore,
}: {
  assembly: Assembly;
  folders: FolderDefinition[];
  selectedByFolder: Map<string, Set<string>>;
  trackStore: TrackStoreInstance;
}) => {
  const managedIds = new Set<string>();
  folders.forEach((folder) => {
    folder.rowById.forEach((_row, id) => {
      managedIds.add(id);
    });
  });

  const existingTracks = trackStore.getState().tracks;
  const unmanagedTracks = existingTracks.filter(
    (track) => !managedIds.has(track.id),
  );
  const managedTracks = buildManagedTracks(folders, selectedByFolder, assembly);

  trackStore.getState().setTracks([...unmanagedTracks, ...managedTracks]);
};

export const reconcileManagedSelectionWithStore = ({
  folders,
  selectedByFolder,
  trackStore,
}: {
  folders: FolderDefinition[];
  selectedByFolder: Map<string, Set<string>>;
  trackStore: TrackStoreInstance;
}) => {
  const trackIds = new Set(
    trackStore.getState().tracks.map((track) => track.id),
  );
  let changed = false;
  const nextSelectedByFolder = cloneSelectionMap(selectedByFolder);

  folders.forEach((folder) => {
    const currentIds = selectedByFolder.get(folder.id) ?? new Set<string>();
    const nextIds = new Set(
      Array.from(currentIds).filter(
        (id) => folder.rowById.has(id) && trackIds.has(id),
      ),
    );

    if (nextIds.size !== currentIds.size) {
      changed = true;
      nextSelectedByFolder.set(folder.id, nextIds);
    }
  });

  return changed ? nextSelectedByFolder : selectedByFolder;
};
