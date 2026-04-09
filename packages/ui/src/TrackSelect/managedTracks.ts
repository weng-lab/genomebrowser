import { Track, TrackStoreInstance } from "@weng-lab/genomebrowser";
import { Assembly, FolderDefinition } from "./Folders/types";

export interface ManagedTrackDecorationContext {
  assembly: Assembly;
  folder: FolderDefinition;
  row: unknown;
  track: Track;
}

export type ManagedTrackDecorator = (
  context: ManagedTrackDecorationContext,
) => Track | null;

export const cloneSelectionMap = (selection: Map<string, Set<string>>) => {
  const map = new Map<string, Set<string>>();
  selection.forEach((ids, folderId) => {
    map.set(folderId, new Set(ids));
  });
  return map;
};

export const buildSelectionOrderFromSelectionMap = (
  folders: FolderDefinition[],
  selectedByFolder: Map<string, Set<string>>,
) => {
  return folders.flatMap((folder) =>
    Array.from(selectedByFolder.get(folder.id) ?? []),
  );
};

export const buildManagedTracks = (
  folders: FolderDefinition[],
  selectedByFolder: Map<string, Set<string>>,
  assembly: Assembly,
  decorateTrack?: ManagedTrackDecorator,
) => {
  return folders.flatMap((folder) => {
    const selectedIds = selectedByFolder.get(folder.id) ?? new Set<string>();
    return Array.from(selectedIds).flatMap((id) => {
      const row = folder.rowById.get(id);
      if (!row) {
        return [];
      }

      const track = folder.createTrack(row, { assembly });
      if (!track) {
        return [];
      }

      const decoratedTrack = decorateTrack
        ? decorateTrack({ assembly, folder, row, track })
        : track;

      return decoratedTrack ? [decoratedTrack] : [];
    });
  });
};

const buildManagedTracksInSelectionOrder = ({
  assembly,
  decorateTrack,
  folders,
  selectedByFolder,
  selectedTrackIdsInOrder,
}: {
  assembly: Assembly;
  decorateTrack?: ManagedTrackDecorator;
  folders: FolderDefinition[];
  selectedByFolder: Map<string, Set<string>>;
  selectedTrackIdsInOrder: string[];
}) => {
  const folderByTrackId = new Map<string, FolderDefinition>();

  folders.forEach((folder) => {
    folder.rowById.forEach((_row, id) => {
      folderByTrackId.set(id, folder);
    });
  });

  return selectedTrackIdsInOrder.flatMap((id) => {
    const folder = folderByTrackId.get(id);
    if (!folder || !selectedByFolder.get(folder.id)?.has(id)) {
      return [];
    }

    const row = folder.rowById.get(id);
    if (!row) {
      return [];
    }

    const track = folder.createTrack(row, { assembly });
    if (!track) {
      return [];
    }

    const decoratedTrack = decorateTrack
      ? decorateTrack({ assembly, folder, row, track })
      : track;

    return decoratedTrack ? [decoratedTrack] : [];
  });
};

export const deriveManagedSelectionFromStore = ({
  folders,
  trackStore,
}: {
  folders: FolderDefinition[];
  trackStore: TrackStoreInstance;
}) => {
  const folderByTrackId = new Map<string, string>();
  const selectedByFolder = new Map<string, Set<string>>();

  folders.forEach((folder) => {
    selectedByFolder.set(folder.id, new Set<string>());
    folder.rowById.forEach((_row, id) => {
      folderByTrackId.set(id, folder.id);
    });
  });

  trackStore.getState().tracks.forEach((track) => {
    const folderId = folderByTrackId.get(track.id);
    if (!folderId) {
      return;
    }

    selectedByFolder.get(folderId)?.add(track.id);
  });

  return selectedByFolder;
};

export const deriveManagedSelectionOrderFromStore = ({
  folders,
  trackStore,
}: {
  folders: FolderDefinition[];
  trackStore: TrackStoreInstance;
}) => {
  const managedIds = new Set<string>();

  folders.forEach((folder) => {
    folder.rowById.forEach((_row, id) => {
      managedIds.add(id);
    });
  });

  return trackStore
    .getState()
    .tracks.filter((track) => managedIds.has(track.id))
    .map((track) => track.id);
};

export const replaceManagedTracksInStore = ({
  assembly,
  folders,
  selectedByFolder,
  selectedTrackIdsInOrder,
  trackStore,
  decorateTrack,
}: {
  assembly: Assembly;
  folders: FolderDefinition[];
  selectedByFolder: Map<string, Set<string>>;
  selectedTrackIdsInOrder?: string[];
  trackStore: TrackStoreInstance;
  decorateTrack?: ManagedTrackDecorator;
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
  const managedTracks = selectedTrackIdsInOrder
    ? buildManagedTracksInSelectionOrder({
        assembly,
        decorateTrack,
        folders,
        selectedByFolder,
        selectedTrackIdsInOrder,
      })
    : buildManagedTracks(folders, selectedByFolder, assembly, decorateTrack);

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
