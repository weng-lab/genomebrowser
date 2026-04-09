import { TreeViewBaseItem } from "@mui/x-tree-view";
import { ExtendedTreeItemProps } from "../../../types";
import { GeneRowInfo } from "./types";

/**
 * Builds a flat tree structure for the TreeView panel (selected items)
 * Since genes have no grouping, this is a simple root -> leaf structure
 *
 * @param selectedRows - Selected gene rows
 * @param rootLabel - Label for the root node
 * @returns Tree structure for RichTreeView
 */
export function buildTreeView(
  selectedRows: GeneRowInfo[],
  rootLabel: string = "Genes",
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  // Root node
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
      label: row.displayName,
      icon: "removeable",
      children: [],
      allExpAccessions: [row.id],
    };
    root.children!.push(leafNode);
    root.allExpAccessions!.push(row.id);
  });

  return [root];
}
