import { TreeViewBaseItem } from "@mui/x-tree-view";
import { ExtendedTreeItemProps } from "../../../types";
import { OtherTrackInfo } from "./types";

export function buildTreeView(
  selectedIds: string[],
  rowById: Map<string, OtherTrackInfo>,
  rootLabel: string = "Other Tracks",
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const root: TreeViewBaseItem<ExtendedTreeItemProps> = {
    id: "root",
    label: rootLabel,
    icon: "folder",
    children: [],
    allExpAccessions: [],
  };

  selectedIds.forEach((id) => {
    const row = rowById.get(id);
    if (row) {
      const leafNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
        id: row.id,
        label: row.name,
        icon: "removeable",
        children: [],
        allExpAccessions: [row.id],
      };
      root.children!.push(leafNode);
      root.allExpAccessions!.push(row.id);
    }
  });

  return [root];
}
