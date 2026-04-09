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

export interface ManagedDraftSelection {
  selectedByFolder: Map<string, Set<string>>;
  selectedTrackIdsInOrder: string[];
}

export const cloneSelectionMap = (selection: Map<string, Set<string>>) => {
  const map = new Map<string, Set<string>>();
  selection.forEach((ids, folderId) => {
    map.set(folderId, new Set(ids));
  });
  return map;
};

const buildFolderByTrackId = (folders: FolderDefinition[]) => {
  const folderByTrackId = new Map<string, FolderDefinition>();

  folders.forEach((folder) => {
    folder.rowById.forEach((_row, id) => {
      folderByTrackId.set(id, folder);
    });
  });

  return folderByTrackId;
};

const collectManagedTrackIds = (folders: FolderDefinition[]) => {
  const managedIds = new Set<string>();

  folders.forEach((folder) => {
    folder.rowById.forEach((_row, id) => {
      managedIds.add(id);
    });
  });

  return managedIds;
};

const buildManagedTrack = ({
  assembly,
  decorateTrack,
  folder,
  id,
}: {
  assembly: Assembly;
  decorateTrack?: ManagedTrackDecorator;
  folder: FolderDefinition;
  id: string;
}) => {
  const row = folder.rowById.get(id);
  if (!row) {
    return null;
  }

  const track = folder.createTrack(row, { assembly });
  if (!track) {
    return null;
  }

  return decorateTrack
    ? decorateTrack({ assembly, folder, row, track })
    : track;
};

export const createEmptyManagedDraftSelection = (
  folders: FolderDefinition[],
): ManagedDraftSelection => {
  return {
    selectedByFolder: new Map(
      folders.map((folder) => [folder.id, new Set<string>()]),
    ),
    selectedTrackIdsInOrder: [],
  };
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
      const track = buildManagedTrack({ assembly, decorateTrack, folder, id });
      return track ? [track] : [];
    });
  });
};

const buildManagedTracksFromDraftSelection = ({
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
  const folderByTrackId = buildFolderByTrackId(folders);

  return selectedTrackIdsInOrder.flatMap((id) => {
    const folder = folderByTrackId.get(id);
    if (!folder || !selectedByFolder.get(folder.id)?.has(id)) {
      return [];
    }

    const track = buildManagedTrack({ assembly, decorateTrack, folder, id });
    return track ? [track] : [];
  });
};

export const deriveManagedDraftSelectionFromStore = ({
  folders,
  trackStore,
}: {
  folders: FolderDefinition[];
  trackStore: TrackStoreInstance;
}): ManagedDraftSelection => {
  const draftSelection = createEmptyManagedDraftSelection(folders);
  const folderByTrackId = new Map<string, string>();

  folders.forEach((folder) => {
    folder.rowById.forEach((_row, id) => {
      folderByTrackId.set(id, folder.id);
    });
  });

  trackStore.getState().tracks.forEach((track) => {
    const folderId = folderByTrackId.get(track.id);
    if (!folderId) {
      return;
    }

    draftSelection.selectedByFolder.get(folderId)?.add(track.id);
    draftSelection.selectedTrackIdsInOrder.push(track.id);
  });

  return draftSelection;
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
  selectedTrackIdsInOrder: string[];
  trackStore: TrackStoreInstance;
  decorateTrack?: ManagedTrackDecorator;
}) => {
  const managedIds = collectManagedTrackIds(folders);

  const existingTracks = trackStore.getState().tracks;
  const unmanagedTracks = existingTracks.filter(
    (track) => !managedIds.has(track.id),
  );
  const managedTracks = buildManagedTracksFromDraftSelection({
    assembly,
    decorateTrack,
    folders,
    selectedByFolder,
    selectedTrackIdsInOrder,
  });

  trackStore.getState().setTracks([...unmanagedTracks, ...managedTracks]);
};
