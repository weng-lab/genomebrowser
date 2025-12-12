import { RowInfo, ExtendedTreeItemProps, CustomLabelProps, CustomTreeItemProps } from "./types";
import React from "react";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import {
  TreeItemCheckbox,
  TreeItemIconContainer,
  TreeItemLabel,
} from "@mui/x-tree-view/TreeItem";
import {
  useTreeItem,
} from "@mui/x-tree-view/useTreeItem";
import { TreeItemIcon } from "@mui/x-tree-view/TreeItemIcon";
import { TreeItemProvider } from "@mui/x-tree-view/TreeItemProvider";
import { useTreeItemModel } from "@mui/x-tree-view/hooks";
import Folder from "@mui/icons-material/Folder";
import IndeterminateCheckBoxRoundedIcon from "@mui/icons-material/IndeterminateCheckBoxRounded";
import Collapse from "@mui/material/Collapse";
import { styled, alpha } from "@mui/material/styles";
import { 
  Box, 
  Typography,
} from "@mui/material";

/**
 * Create the file directory RichTreeView structure from the selected rows.
 * @param selectedRows selected rows from the DataGrid
 * @param root first TreeItem node
 * @param sortedAssay boolean indicating whether to sort by assay or ontology first
 * @returns a list of TreeViewBaseItem for RichTreeView
 */
export function buildTreeView(
  selectedRows: RowInfo[],
  root: TreeViewBaseItem<ExtendedTreeItemProps>,
  sortedAssay: boolean,
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const topLevelType: keyof RowInfo = sortedAssay ? "assay" : "ontology";
  const secondLevelType: keyof RowInfo = sortedAssay ? "ontology" : "assay";
  const topLevelMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >(); // keep track of top level nodes
  let idx = 1; // appending index to the ids of TreeItems to ensure uniqueness

  selectedRows.forEach((row) => {
    let topLevelNode = topLevelMap.get(row[topLevelType]);
    if (!topLevelNode) {
      topLevelNode = {
        id: row[topLevelType],
        label: row[topLevelType],
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      topLevelMap.set(row[topLevelType], topLevelNode);
      root.children!.push(topLevelNode);
    }

    let secondLevelNode = topLevelNode.children!.find(
      (child) => child.label === row[secondLevelType],
    );
    if (!secondLevelNode) {
      secondLevelNode = {
        id: row[secondLevelType] + "_" + idx++,
        label: row[secondLevelType],
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      topLevelNode.children!.push(secondLevelNode);
    }

    const displayNameNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.displayname + "_" + idx++,
      label: row.displayname,
      icon: "removeable",
      children: [],
    };
    secondLevelNode.children!.push(displayNameNode);

    const expNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.experimentAccession,
      label: row.experimentAccession,
      icon: "experiment",
      children: [],
    };
    displayNameNode.children!.push(expNode);

    if (row.fileAccession) {
      // only add if fileAccession exists
      const fileNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
        id: row.fileAccession + "_" + idx++,
        label: row.fileAccession,
        icon: "file",
        children: [],
      };
      displayNameNode.children!.push(fileNode);
    }
    topLevelNode.allExpAccessions!.push(row.experimentAccession);
    secondLevelNode.allExpAccessions!.push(row.experimentAccession);
  });
  return [root];
}

function AccessionIcon(type: string) {
  const colorMap: { [key: string]: string } = {
    dnase: "#06da93",
    atac: "#02c7b9",
    h3k4me3: "#db5379", // chose a random color for this one, check with mansi later
    chromhmm: "#0097a7",
    h3k27ac: "#fdc401",
    ctcf: "#01a6f1",
    experiment: "#ff2020",
    file: "#0fb4f1",
  };
  const color = colorMap[type];
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "20%",
        bgcolor: color,
      }}
    />
  );
}

const TreeItemRoot = styled("li")(({ theme }) => ({
  listStyle: "none",
  margin: 0,
  padding: 0,
  outline: 4,
  color: theme.palette.grey[400],
  ...theme.applyStyles("light", {
    color: theme.palette.grey[600], // controls colors of the MUI icons
  }),
}));

const TreeItemLabelText = styled(Typography)({
  color: "black",
  fontFamily: "inherit",
  fontWeight: 500,
});

function CustomLabel({ icon: Icon, children, ...other }: CustomLabelProps) {
  return (
    <TreeItemLabel
      {...other}
      sx={{
        display: "flex",
        alignItems: "center",
      }}
    >
      {Icon && React.isValidElement(Icon) ? (
        <Box className="labelIcon" sx={{ mr: 1 }}>
          {Icon}
        </Box>
      ) : (
        <Box
          component={Icon as React.ElementType}
          className="labelIcon"
          color="inherit"
          sx={{ mr: 1, fontSize: "1.2rem" }}
        />
      )}
      <TreeItemLabelText variant="body2">{children}</TreeItemLabelText>
    </TreeItemLabel>
  );
}

const TreeItemContent = styled("div")(({ theme }) => ({
  padding: theme.spacing(0.5),
  paddingRight: theme.spacing(2),
  paddingLeft: `calc(${theme.spacing(1)} + var(--TreeView-itemChildrenIndentation) * var(--TreeView-itemDepth))`,
  width: "100%",
  boxSizing: "border-box", // prevent width + padding to overflow
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  flexDirection: "row-reverse",
  borderRadius: theme.spacing(0.7),
  marginBottom: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  fontWeight: 500,
  [`&[data-focused], &[data-selected]`]: {
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.primary.contrastText,
    ...theme.applyStyles("light", {
      backgroundColor: theme.palette.primary.main,
    }),
  },
  "&:not([data-focused], [data-selected]):hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: "white",
    ...theme.applyStyles("light", {
      color: theme.palette.primary.main,
    }),
  },
}));

const getIconFromTreeItemType = (itemType: string) => {
  switch (itemType) {
    case "folder":
      return Folder;
    case "removeable":
      return IndeterminateCheckBoxRoundedIcon;
    default:
      return AccessionIcon(itemType);
  }
};

export const CustomTreeItem = React.forwardRef(function CustomTreeItem(
  props: CustomTreeItemProps,
  ref: React.Ref<HTMLLIElement>,
) {
  const { id, itemId, label, disabled, children, onRemove, ...other } = props;

  const {
    getContextProviderProps,
    getRootProps,
    getContentProps,
    getIconContainerProps,
    getCheckboxProps,
    getLabelProps,
    getGroupTransitionProps,
    status,
  } = useTreeItem({ id, itemId, children, label, disabled, rootRef: ref });

  const item = useTreeItemModel<ExtendedTreeItemProps>(itemId)!;
  const icon = getIconFromTreeItemType(item.icon);
  
  const handleRemoveIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();     // prevent item expand/select
    onRemove?.(item);
  }
  
  return (
    <TreeItemProvider {...getContextProviderProps()}>
      <TreeItemRoot {...getRootProps(other)}>
        <TreeItemContent {...getContentProps()}>
          <TreeItemIconContainer {...getIconContainerProps()}>
            <TreeItemIcon status={status} />
          </TreeItemIconContainer>
          <TreeItemCheckbox {...getCheckboxProps()} />
          <CustomLabel
            {...getLabelProps({
              icon: (
                item.icon === "removeable" ? (
                  <Box
                    onClick={handleRemoveIconClick}
                    sx={{
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      cursor: "pointer",
                      mr: 1,
                      "&:hover": {
                        backgroundColor: "rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    <IndeterminateCheckBoxRoundedIcon fontSize="small" />
                  </Box>
                ) : (
                  icon 
                )
              ),
              expandable: status.expandable && status.expanded,
            })}
          />
        </TreeItemContent>
        {children && <Collapse {...getGroupTransitionProps()} />}
      </TreeItemRoot>
    </TreeItemProvider>
  );
});