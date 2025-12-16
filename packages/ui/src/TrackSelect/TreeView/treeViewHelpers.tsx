import Folder from "@mui/icons-material/Folder";
import IndeterminateCheckBoxRoundedIcon from "@mui/icons-material/IndeterminateCheckBoxRounded";
import { Box, Typography } from "@mui/material";
import Collapse from "@mui/material/Collapse";
import { alpha, styled } from "@mui/material/styles";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import {
  TreeItemCheckbox,
  TreeItemIconContainer,
  TreeItemLabel,
} from "@mui/x-tree-view/TreeItem";
import { TreeItemIcon } from "@mui/x-tree-view/TreeItemIcon";
import { TreeItemProvider } from "@mui/x-tree-view/TreeItemProvider";
import { useTreeItemModel } from "@mui/x-tree-view/hooks";
import { useTreeItem } from "@mui/x-tree-view/useTreeItem";
import React from "react";
import {
  CustomLabelProps,
  CustomTreeItemProps,
  ExtendedTreeItemProps,
  RowInfo,
} from "../types";

// export function buildGenericTreeView(
//   selectedRows: RowInfo[],
//   root: TreeViewBaseItem<ExtendedTreeItemProps>,
// ): TreeViewBaseItem<ExtendedTreeItemProps>[] {
//   const topLevelMap = new Map<
//     string,
//     TreeViewBaseItem<ExtendedTreeItemProps>
//   >();
//   const secondLevelMap = new Map<
//     string,
//     TreeViewBaseItem<ExtendedTreeItemProps>
//   >();

// }

export function buildSortedAssayTreeView(
  selectedIds: string[],
  rowById: Map<string, RowInfo>,
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const assayMap = new Map<string, TreeViewBaseItem<ExtendedTreeItemProps>>(); // keep track of top level nodes
  const ontologyMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const sampleAssayMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const root: TreeViewBaseItem<ExtendedTreeItemProps> = {
    id: "1",
    label: "Biosamples",
    icon: "folder",
    children: [],
  };
  let idx = 1;

  const selectedRows = selectedIds.reduce<RowInfo[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);

  console.log("selectedRows: ", selectedRows);

  selectedRows.forEach((row) => {
    let assayNode = assayMap.get(row.assay);
    if (!assayNode) {
      assayNode = {
        id: row.assay,
        label: row.assay,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      assayMap.set(row.assay, assayNode);
      root.children!.push(assayNode);
    }

    let ontologyNode = ontologyMap.get(row.ontology + row.assay);
    if (!ontologyNode) {
      ontologyNode = {
        id: row.ontology + "_" + idx++,
        label: row.ontology,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      assayNode.children!.push(ontologyNode);
      ontologyMap.set(row.ontology + row.assay, ontologyNode);
    }

    const displayNameNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.displayname + "_" + idx++,
      label: row.displayname,
      icon: "removeable",
      children: [],
      allExpAccessions: [],
    };
    ontologyNode.children!.push(displayNameNode);

    let expNode = sampleAssayMap.get(row.displayname + row.experimentAccession);
    if (!expNode) {
      expNode = {
        id: row.experimentAccession,
        label: row.experimentAccession,
        icon: row.assay,
        children: [],
      };
      sampleAssayMap.set(row.displayname + row.assay, expNode);
      displayNameNode.children!.push(expNode);
    }
    ontologyNode.allExpAccessions!.push(row.experimentAccession);
    displayNameNode.allExpAccessions!.push(row.experimentAccession);
  });
  return [root];
}

/**
 * Create the file directory RichTreeView structure from the selected rows.
 * @param selectedRows selected rows from the DataGrid
 * @param root first TreeItem node
 * @param sortedAssay boolean indicating whether to sort by assay or ontology first
 * @returns a list of TreeViewBaseItem for RichTreeView
 */
export function buildTreeView(
  selectedIds: string[],
  rowById: Map<string, RowInfo>,
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const ontologyMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >(); // keep track of top level nodes
  const displayNameMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const sampleAssayMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const root: TreeViewBaseItem<ExtendedTreeItemProps> = {
    id: "1",
    label: "Biosamples",
    icon: "folder",
    children: [],
  };

  const selectedRows = selectedIds.reduce<RowInfo[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);
  console.log("selectedRows: ", selectedRows);

  selectedRows.forEach((row) => {
    if (!row) {
      return;
    }
    let ontologyNode = ontologyMap.get(row.ontology);
    if (!ontologyNode) {
      ontologyNode = {
        id: row.ontology,
        label: row.ontology,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      ontologyMap.set(row.ontology, ontologyNode);
      root.children!.push(ontologyNode);
    }

    let displayNameNode = displayNameMap.get(row.displayname);
    if (!displayNameNode) {
      displayNameNode = {
        id: row.displayname,
        label: row.displayname,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      ontologyNode.children!.push(displayNameNode);
      displayNameMap.set(row.displayname, displayNameNode);
    }

    let expNode = sampleAssayMap.get(row.displayname + row.assay);
    if (!expNode) {
      expNode = {
        id: row.experimentAccession,
        label: row.experimentAccession,
        icon: row.assay,
        children: [],
      };
      sampleAssayMap.set(row.displayname + row.assay, expNode);
      displayNameNode.children!.push(expNode);
    }
    ontologyNode.allExpAccessions!.push(row.experimentAccession);
    displayNameNode.allExpAccessions!.push(row.experimentAccession);
  });
  return [root];
}

function AccessionIcon(type: string) {
  const colorMap: { [key: string]: string } = {
    DNase: "#06da93",
    ATAC: "#02c7b9",
    H3K4me3: "#ff2020",
    ChromHMM: "#0097a7",
    H3K27ac: "#fdc401",
    CTCF: "#01a6f1",
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
    e.stopPropagation(); // prevent item expand/select
    onRemove?.(item);
  };

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
              icon:
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
