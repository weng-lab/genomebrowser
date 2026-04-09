import { TreeViewBaseItem } from "@mui/x-tree-view";
import { FolderDefinition, FolderView } from "./Folders/types";
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

const resolveFolderView = (
  folder: FolderDefinition,
  activeViewIdByFolder: Map<string, string>,
): FolderView => {
  const activeViewId = activeViewIdByFolder.get(folder.id);
  const activeView = folder.views?.find((view) => view.id === activeViewId);

  return (
    activeView ??
    folder.views?.[0] ?? {
      id: "default",
      label: folder.label,
      columns: folder.columns,
      groupingModel: folder.groupingModel,
      leafField: folder.leafField,
      buildTree: folder.buildTree,
    }
  );
};

export const deriveTrackSelectViewData = ({
  activeFolderId,
  activeViewIdByFolder,
  folders,
  selectedByFolder,
}: {
  activeFolderId: string;
  activeViewIdByFolder: Map<string, string>;
  folders: FolderDefinition[];
  selectedByFolder: Map<string, Set<string>>;
}) => {
  const activeFolder =
    folders.find((folder) => folder.id === activeFolderId) ?? folders[0];
  const selectedCount = countSelectedTracks(selectedByFolder);

  if (!activeFolder) {
    return {
      activeConfig: undefined,
      activeFolder: undefined,
      activeViewId: "",
      folderTrees: [] as FolderTreeConfig[],
      rows: [] as unknown[],
      selectedCount,
      selectedIds: new Set<string>(),
    };
  }

  const activeConfig = resolveFolderView(activeFolder, activeViewIdByFolder);
  const selectedIds = new Set(selectedByFolder.get(activeFolder.id) ?? []);
  const rows = activeFolder.rows;
  const folderTrees = folders.flatMap((folder) => {
    const folderSelectedIds = selectedByFolder.get(folder.id);
    if (!folderSelectedIds || folderSelectedIds.size === 0) {
      return [];
    }
    const config = resolveFolderView(folder, activeViewIdByFolder);

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
    activeViewId: activeConfig.id,
    folderTrees,
    rows,
    selectedCount,
    selectedIds,
  };
};
