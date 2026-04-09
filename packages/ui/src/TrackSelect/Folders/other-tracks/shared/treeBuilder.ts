import { TreeViewBaseItem } from "@mui/x-tree-view";
import { ExtendedTreeItemProps } from "../../../types";
import { OtherTrackInfo } from "./types";

export function buildTreeView(
  selectedRows: OtherTrackInfo[],
  rootLabel: string = "Other Tracks",
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const root: TreeViewBaseItem<ExtendedTreeItemProps> = {
    id: "root",
    label: rootLabel,
    icon: "folder",
    children: [],
    allExpAccessions: [],
  };

  selectedRows.forEach((row) => {
    const leafNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.id,
      label: row.name,
      icon: "removeable",
      children: [],
      allExpAccessions: [row.id],
    };
    root.children!.push(leafNode);
    root.allExpAccessions!.push(row.id);
  });

  return [root];
}
