import { 
  Box, 
  Typography,
  Paper
} from "@mui/material";
import { ExtendedTreeItemProps, CustomTreeItemProps, TreeViewWrapperProps, RowInfo } from "./types";
import { rows } from "./consts";
import { buildTreeView, CustomTreeItem } from "./treeViewHelpers";
import { useMemo } from "react";
import { TreeViewBaseItem, RichTreeView } from "@mui/x-tree-view";

export function TreeViewWrapper({selectedIds, remove}: TreeViewWrapperProps) {
    console.log("treeview ids: ", selectedIds)
    
    const rowById = new Map<string, RowInfo>(
      rows.map((r) => [r.experimentAccession, r]),
    );

    const handleRemoveTreeItem = (item: TreeViewBaseItem<ExtendedTreeItemProps>) => {
        const removedIds = item.allExpAccessions;
        if (removedIds && removedIds.length) {
          remove(new Set(removedIds));
        }
    };

    const treeItems = useMemo(() => {
        return buildTreeView(Array.from(selectedIds), rowById); // TODO: refactor these to put into one function
    }, [selectedIds]);

    return (
        <Paper>
            <Box sx={{ width: "500px", height: "500px", overflow: "auto" }}>
                <Typography>
                    <Box sx={{ fontWeight: "bold", padding: 2 }}>Active Tracks</Box>
                </Typography>
                <RichTreeView
                    items={treeItems}
                    defaultExpandedItems={['1']}
                    slots={{ item: CustomTreeItem  }}
                    slotProps = {{ 
                        item: { 
                            onRemove: handleRemoveTreeItem 
                        } as Partial<CustomTreeItemProps> // avoiding the slotProps typing error
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
    )
}