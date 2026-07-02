import type { TrackSelectFolder } from "../schema/folderSchema";

export function getInitialViewIds(folders: TrackSelectFolder[]) {
  return new Map(folders.map((folder) => [folder.id, folder.views[0].id]));
}

export function getActiveView(
  folder: TrackSelectFolder,
  activeViewIdByFolder: Map<string, string>,
) {
  return (
    folder.views.find(
      (view) => view.id === activeViewIdByFolder.get(folder.id),
    ) ?? folder.views[0]
  );
}
