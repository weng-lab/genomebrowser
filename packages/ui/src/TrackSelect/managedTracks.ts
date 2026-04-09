import { Track } from "@weng-lab/genomebrowser";
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
}

export const cloneSelectionMap = (selection: Map<string, Set<string>>) => {
  const map = new Map<string, Set<string>>();
  selection.forEach((ids, folderId) => {
    map.set(folderId, new Set(ids));
  });
  return map;
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

export const deriveManagedDraftSelectionFromTracks = ({
  folders,
  tracks,
}: {
  folders: FolderDefinition[];
  tracks: Track[];
}): ManagedDraftSelection => {
  const draftSelection = createEmptyManagedDraftSelection(folders);
  const folderByTrackId = new Map<string, string>();

  folders.forEach((folder) => {
    folder.rowById.forEach((_row, id) => {
      folderByTrackId.set(id, folder.id);
    });
  });

  tracks.forEach((track) => {
    const folderId = folderByTrackId.get(track.id);
    if (!folderId) {
      return;
    }

    draftSelection.selectedByFolder.get(folderId)?.add(track.id);
  });

  return draftSelection;
};

export const diffManagedTracks = ({
  assembly,
  currentTracks,
  folders,
  selectedByFolder,
  decorateTrack,
}: {
  assembly: Assembly;
  currentTracks: Track[];
  folders: FolderDefinition[];
  selectedByFolder: Map<string, Set<string>>;
  decorateTrack?: ManagedTrackDecorator;
}) => {
  const managedIds = collectManagedTrackIds(folders);
  const currentManagedIds = new Set<string>();
  const nextManagedIds = new Set<string>();
  const idsToRemove: string[] = [];
  const tracksToAdd: Track[] = [];

  currentTracks.forEach((track) => {
    if (managedIds.has(track.id)) {
      currentManagedIds.add(track.id);
    }
  });

  folders.forEach((folder) => {
    const selectedIds = selectedByFolder.get(folder.id) ?? new Set<string>();

    selectedIds.forEach((id) => {
      nextManagedIds.add(id);
    });
  });

  currentManagedIds.forEach((id) => {
    if (!nextManagedIds.has(id)) {
      idsToRemove.push(id);
    }
  });

  folders.forEach((folder) => {
    const selectedIds = selectedByFolder.get(folder.id) ?? new Set<string>();

    selectedIds.forEach((id) => {
      if (currentManagedIds.has(id)) {
        return;
      }

      const track = buildManagedTrack({
        assembly,
        decorateTrack,
        folder,
        id,
      });

      if (track) {
        tracksToAdd.push(track);
      }
    });
  });

  return {
    idsToRemove,
    tracksToAdd,
  };
};
