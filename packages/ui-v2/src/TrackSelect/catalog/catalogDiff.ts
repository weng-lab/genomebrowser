import type {
  TrackSelectFolder,
  TrackSelectTrack,
} from "../schema/folderSchema";
import type { SelectedByFolder } from "./catalogSelection";
import { getCatalogTrackById } from "./catalogRows";
import { getOrderedSelectedRows } from "./catalogOrder";
import type { CatalogStoreTrack } from "./catalogTypes";
import { getActiveView } from "./catalogViews";

export function getSelectionDiff({
  folders,
  tracks,
  selectedByFolder,
  activeViewIdByFolder,
}: {
  folders: TrackSelectFolder[];
  tracks: CatalogStoreTrack[];
  selectedByFolder: SelectedByFolder;
  activeViewIdByFolder: Map<string, string>;
}) {
  const catalogTrackById = getCatalogTrackById(folders);
  const currentCatalogTrackIds = new Set<string>();
  for (const track of tracks) {
    if (catalogTrackById.has(track.base.id)) {
      currentCatalogTrackIds.add(track.base.id);
    }
  }
  const nextSelectedIds = new Set<string>();
  const tracksToAdd: { id: string; track: TrackSelectTrack }[] = [];

  for (const folder of folders) {
    const selectedIds = selectedByFolder.get(folder.id) ?? new Set<string>();
    for (const id of selectedIds) nextSelectedIds.add(id);

    const activeView = getActiveView(folder, activeViewIdByFolder);
    for (const row of getOrderedSelectedRows(folder, activeView, selectedIds)) {
      if (currentCatalogTrackIds.has(row.id)) continue;
      tracksToAdd.push({ id: row.id, track: row.track });
    }
  }

  const idsToRemove = Array.from(currentCatalogTrackIds).filter(
    (id) => !nextSelectedIds.has(id),
  );

  return { idsToRemove, tracksToAdd };
}
