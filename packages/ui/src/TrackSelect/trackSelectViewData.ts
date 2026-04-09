import { TreeViewBaseItem } from "@mui/x-tree-view";
import { FolderDefinition } from "./Folders/types";
import {
  deriveFolderRuntimeConfig,
  FolderRuntimeConfigOverrides,
} from "./trackSelectRuntimeConfig";
import { ExtendedTreeItemProps, FolderTreeConfig } from "./types";

const attachFolderId = (
  items: TreeViewBaseItem<ExtendedTreeItemProps>[],
  folderId: string,
): TreeViewBaseItem<ExtendedTreeItemProps>[] => {
  return items.map((item) => ({
    ...item,
    folderId,
    children: item.children
      ? attachFolderId(item.children, folderId)
      : undefined,
  }));
};

const countSelectedTracks = (selectedByFolder: Map<string, Set<string>>) => {
  let total = 0;
  selectedByFolder.forEach((ids) => {
    total += ids.size;
  });
  return total;
};

export const deriveTrackSelectViewData = ({
  activeFolderId,
  folders,
  runtimeConfigOverridesByFolder,
  selectedByFolder,
}: {
  activeFolderId: string;
  folders: FolderDefinition[];
  runtimeConfigOverridesByFolder: FolderRuntimeConfigOverrides;
  selectedByFolder: Map<string, Set<string>>;
}) => {
  const activeFolder =
    folders.find((folder) => folder.id === activeFolderId) ?? folders[0];
  const selectedCount = countSelectedTracks(selectedByFolder);

  if (!activeFolder) {
    return {
      activeConfig: undefined,
      activeFolder: undefined,
      folderTrees: [] as FolderTreeConfig[],
      rows: [] as unknown[],
      selectedCount,
      selectedIds: new Set<string>(),
    };
  }

  const activeConfig = deriveFolderRuntimeConfig({
    folder: activeFolder,
    runtimeConfigOverridesByFolder,
  });
  const selectedIds = new Set(selectedByFolder.get(activeFolder.id) ?? []);
  const rows = activeFolder.rows;
  const folderTrees = folders.flatMap((folder) => {
    const folderSelectedIds = selectedByFolder.get(folder.id);
    if (!folderSelectedIds || folderSelectedIds.size === 0) {
      return [];
    }
    const config = deriveFolderRuntimeConfig({
      folder,
      runtimeConfigOverridesByFolder,
    });

    return [
      {
        folderId: folder.id,
        items: attachFolderId(
          config.buildTree(
            folder.rows.filter((row) => folderSelectedIds.has(row.id)),
          ),
          folder.id,
        ),
        TreeItemComponent: folder.TreeItemComponent,
      },
    ];
  });

  return {
    activeConfig,
    activeFolder,
    folderTrees,
    rows,
    selectedCount,
    selectedIds,
  };
};
