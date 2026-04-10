import { Track } from "@weng-lab/genomebrowser";
import { Assembly, FolderDefinition } from "./Folders/types";
import type { TrackSelectTrackContext } from "./trackContext";

export interface ManagedDraftSelection {
  selectedByFolder: Map<string, Set<string>>;
}

const buildManagedTrack = ({
  assembly,
  folder,
  id,
  trackContext,
}: {
  assembly: Assembly;
  folder: FolderDefinition;
  id: string;
  trackContext?: TrackSelectTrackContext;
}) => {
  const row = folder.rows.find((candidate) => candidate.id === id);
  if (!row) {
    return null;
  }

  const track = folder.createTrack(row, { assembly, trackContext });
  if (!track) {
    return null;
  }

  return track;
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
  trackContext?: TrackSelectTrackContext,
) => {
  return folders.flatMap((folder) => {
    const selectedIds = selectedByFolder.get(folder.id) ?? new Set<string>();
    return Array.from(selectedIds).flatMap((id) => {
      const track = buildManagedTrack({ assembly, folder, id, trackContext });
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

  tracks.forEach((track) => {
    for (const folder of folders) {
      if (!track.id.startsWith(`${folder.id}/`)) {
        continue;
      }

      draftSelection.selectedByFolder.get(folder.id)?.add(track.id);
      break;
    }
  });

  return draftSelection;
};

export const diffManagedTracks = ({
  assembly,
  currentTracks,
  folders,
  selectedByFolder,
  trackContext,
}: {
  assembly: Assembly;
  currentTracks: Track[];
  folders: FolderDefinition[];
  selectedByFolder: Map<string, Set<string>>;
  trackContext?: TrackSelectTrackContext;
}) => {
  const nextManagedIds = new Set<string>();
  const currentManagedIds = new Set<string>();
  const idsToRemove: string[] = [];
  const tracksToAdd: Track[] = [];

  currentTracks.forEach((track) => {
    if (folders.some((folder) => track.id.startsWith(`${folder.id}/`))) {
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
        folder,
        id,
        trackContext,
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
