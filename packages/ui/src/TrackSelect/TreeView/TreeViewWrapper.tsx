import { Box, Paper, Typography } from "@mui/material";
import { RichTreeView, TreeViewBaseItem } from "@mui/x-tree-view";
import {
  CustomTreeItemProps,
  ExtendedTreeItemProps,
  TreeViewWrapperProps,
} from "../types";
import { CustomTreeItem } from "./CustomTreeItem";
import { Avatar } from "@mui/material";

export function TreeViewWrapper({
  items,
  selectedCount,
  onRemove,
}: TreeViewWrapperProps) {
  const handleRemoveTreeItem = (
    item: TreeViewBaseItem<ExtendedTreeItemProps>,
  ) => {
    onRemove(item);
  };

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
          defaultExpandedItems={["1"]}
          slots={{ item: CustomTreeItem }}
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
