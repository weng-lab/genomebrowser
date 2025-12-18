import { Box, Paper, Typography } from "@mui/material";
import { RichTreeView, TreeViewBaseItem } from "@mui/x-tree-view";
import { rowById } from "../consts";
import { CustomTreeItemProps, ExtendedTreeItemProps, TreeViewWrapperProps } from "../types";
import { CustomTreeItem } from "./treeViewHelpers";

export function TreeViewWrapper({ items, activeTracks, remove }: TreeViewWrapperProps) {
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
          // Add the auto-generated group IDs for this track's ontology and assay
          idsToRemove.add(`auto-generated-row-ontology/${row.ontology}`);
          idsToRemove.add(
            `auto-generated-row-ontology/${row.ontology}-assay/${row.assay}`,
          );
          idsToRemove.add(`auto-generated-row-assay/${row.assay}`);
          idsToRemove.add(
            `auto-generated-row-assay/${row.assay}-ontology/${row.ontology}`
          );
        }
      });
      remove(idsToRemove);
    }
  };

  return (
    <Paper sx={{ width: "100%" }}>
      <Box sx={{ width: "100%", height: "500px", overflow: "auto" }}>
        <Typography>
          <Box sx={{ fontWeight: "bold", padding: 2 }}>{activeTracks.size} Active Tracks</Box>
        </Typography>
        <RichTreeView
          items={items}
          defaultExpandedItems={["1"]}
          slots={{ item: CustomTreeItem }}
          slotProps={{
            item: {
              onRemove: handleRemoveTreeItem,
            } as Partial<CustomTreeItemProps>, // cast to avoid the slotProps typing error
          }}
          sx={{
            ml: 1,
            mr: 1,
            height: "fit-content",
            flexGrow: 1,
            overflowY: "auto",
          }}
          itemChildrenIndentation={0}
        />
      </Box>
    </Paper>
  );
}
