import { Avatar, Box, Paper, Typography } from "@mui/material";
import { RichTreeView, TreeViewBaseItem } from "@mui/x-tree-view";
import { useEffect, useMemo, useState } from "react";
import {
  CustomTreeItemProps,
  ExtendedTreeItemProps,
  TreeViewWrapperProps,
} from "../types";
import { CustomTreeItem } from "./CustomTreeItem";

/**
 * Recursively collects all item IDs that have children (expandable items)
 */
function getAllExpandableItemIds(
  items: TreeViewBaseItem<ExtendedTreeItemProps>[],
): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      ids.push(item.id);
      ids.push(...getAllExpandableItemIds(item.children));
    }
  }
  return ids;
}

export function TreeViewWrapper({
  items,
  selectedCount,
  onRemove,
  TreeItemComponent,
}: TreeViewWrapperProps) {
  const allExpandableIds = useMemo(
    () => getAllExpandableItemIds(items),
    [items],
  );
  const [expandedItems, setExpandedItems] =
    useState<string[]>(allExpandableIds);

  // Auto-expand new items when they're added
  useEffect(() => {
    setExpandedItems((prev) => {
      const newIds = allExpandableIds.filter((id) => !prev.includes(id));
      if (newIds.length > 0) {
        return [...prev, ...newIds];
      }
      return prev;
    });
  }, [allExpandableIds]);

  const handleRemoveTreeItem = (
    item: TreeViewBaseItem<ExtendedTreeItemProps>,
  ) => {
    onRemove(item);
  };

  const TreeItem = TreeItemComponent ?? CustomTreeItem;

  return (
    <Paper
      sx={{
        height: 500,
        width: "100%",
        border: "10px solid",
        borderColor: "grey.200",
        boxSizing: "border-box",
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 1,
          backgroundColor: "grey.200",
          flexShrink: 0,
        }}
      >
        <Avatar
          sx={{
            width: 30,
            height: 30,
            fontSize: 14,
            fontWeight: "bold",
            bgcolor: "white",
            color: "text.primary",
          }}
        >
          {selectedCount}
        </Avatar>
        <Typography fontWeight="bold">Active Tracks</Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
        }}
      >
        <RichTreeView
          items={items}
          expandedItems={expandedItems}
          onExpandedItemsChange={(_event, ids) => setExpandedItems(ids)}
          slots={{ item: TreeItem }}
          slotProps={{
            item: {
              onRemove: handleRemoveTreeItem,
            } as Partial<CustomTreeItemProps>,
          }}
          sx={{
            ml: 1,
            mr: 1,
            height: "100%",
          }}
          itemChildrenIndentation={0}
        />
      </Box>
    </Paper>
  );
}
