import { TreeViewBaseItem } from "@mui/x-tree-view";
import { FolderDefinition, FolderRuntimeConfig } from "./Folders/types";
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

const getFolderRuntimeConfig = (
  folder: FolderDefinition,
  runtimeConfigByFolder: Map<string, FolderRuntimeConfig>,
): FolderRuntimeConfig => {
  return (
    runtimeConfigByFolder.get(folder.id) ?? {
      columns: folder.columns,
      groupingModel: folder.groupingModel,
      leafField: folder.leafField,
    }
  );
};

export const deriveTrackSelectViewData = ({
  activeFolderId,
  folders,
  runtimeConfigByFolder,
  selectedByFolder,
}: {
  activeFolderId: string;
  folders: FolderDefinition[];
  runtimeConfigByFolder: Map<string, FolderRuntimeConfig>;
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

  const activeConfig = getFolderRuntimeConfig(
    activeFolder,
    runtimeConfigByFolder,
  );
  const selectedIds = new Set(selectedByFolder.get(activeFolder.id) ?? []);
  const rows = Array.from(activeFolder.rowById.values());
  const folderTrees = folders.flatMap((folder) => {
    const folderSelectedIds = selectedByFolder.get(folder.id);
    if (!folderSelectedIds || folderSelectedIds.size === 0) {
      return [];
    }

    const config = runtimeConfigByFolder.get(folder.id);
    const buildTree = config?.buildTree ?? folder.buildTree;

    return [
      {
        folderId: folder.id,
        items: attachFolderId(
          buildTree(Array.from(folderSelectedIds), folder.rowById),
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
