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
  store,
  items,
  trackIds,
  isSearchResult,
}: TreeViewWrapperProps) {
  const removeIds = store((s) => s.removeIds);
  const rowById = store((s) => s.rowById);

  const handleRemoveTreeItem = (
    item: TreeViewBaseItem<ExtendedTreeItemProps>,
  ) => {
    const removedIds = item.allExpAccessions;
    if (removedIds && removedIds.length) {
      const idsToRemove = new Set(removedIds);

      // Also remove any auto-generated group IDs that contain these tracks
      removedIds.forEach((id) => {
        const row = rowById.get(id);
        if (row) {
          // Add the auto-generated group IDs for this track's grouping hierarchy
          // Default view: ontology -> displayname
          idsToRemove.add(`auto-generated-row-ontology/${row.ontology}`);
          idsToRemove.add(
            `auto-generated-row-ontology/${row.ontology}-displayname/${row.displayname}`,
          );
          // Sorted by assay view: assay -> ontology -> displayname
          idsToRemove.add(`auto-generated-row-assay/${row.assay}`);
          idsToRemove.add(
            `auto-generated-row-assay/${row.assay}-ontology/${row.ontology}`,
          );
        }
      });
      removeIds(idsToRemove);
    }
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
          {trackIds.size}
        </Avatar>
        <Typography fontWeight="bold">
          Active Tracks
          {isSearchResult && (
            <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
              ({items[0].allRowInfo!.length} search results)
            </Typography>
          )}
        </Typography>
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
