import { TreeViewBaseItem } from "@mui/x-tree-view";
import { ExtendedTreeItemProps } from "../../../types";
import { MohdRowInfo } from "./types";

export function buildTreeView(
  selectedIds: string[],
  rowById: Map<string, MohdRowInfo>,
  rootLabel: string = "MOHD",
  folderId: string = "",
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const root: TreeViewBaseItem<ExtendedTreeItemProps> = {
    id: `${folderId}::root`,
    label: rootLabel,
    icon: "folder",
    children: [],
    allExpAccessions: [],
  };

  const sampleMap = new Map<string, TreeViewBaseItem<ExtendedTreeItemProps>>();

  selectedIds.forEach((id) => {
    const row = rowById.get(id);
    if (!row) {
      return;
    }

    let sampleNode = sampleMap.get(row.sampleId);
    if (!sampleNode) {
      sampleNode = {
        id: `${folderId}::${row.sampleId}`,
        label: row.sampleId,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      sampleMap.set(row.sampleId, sampleNode);
      root.children!.push(sampleNode);
    }

    sampleNode.children!.push({
      id: row.id,
      label: row.fileName,
      icon: "removeable",
      children: [],
      allExpAccessions: [row.id],
    });
    sampleNode.allExpAccessions!.push(row.id);
    root.allExpAccessions!.push(row.id);
  });

  return [root];
}
