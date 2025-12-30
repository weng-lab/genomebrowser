import Folder from "@mui/icons-material/Folder";
import IndeterminateCheckBoxRoundedIcon from "@mui/icons-material/IndeterminateCheckBoxRounded";
import { Box, Typography, Stack } from "@mui/material";
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
import Fuse, { FuseResult } from "fuse.js";
import { SearchTracksProps } from "../types";
import { assayTypes, ontologyTypes } from "../consts";


/**
 * Builds tree in the sorted by assay view
 * @param selectedIds: list of ids (from useSelectionStore)
 * @param root: Root TreeViewBaseItem
 * @param rowById: Mapping between an id (experimentAccession) and its RowInfo object
 * @returns all of the items for the RichTreeView in TreeViewWrapper
 */
export function buildSortedAssayTreeView(
  selectedIds: string[],
  root: TreeViewBaseItem<ExtendedTreeItemProps>,
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
  let idx = 1;

  const selectedRows = selectedIds.reduce<RowInfo[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);

  selectedRows.forEach((row) => {
    let assayNode = assayMap.get(row.assay);
    if (!assayNode) {
      assayNode = {
        id: row.assay,
        isAssayItem: true,
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
        isAssayItem: false,
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
      isAssayItem: false,
      label: row.displayname,
      icon: "removeable",
      children: [],
      allExpAccessions: [],
    };
    ontologyNode.children!.push(displayNameNode);

    let expNode = sampleAssayMap.get(row.displayname + row.fileAccession);
    if (!expNode) {
      expNode = {
        id: row.fileAccession,
        isAssayItem: false,
        label: row.fileAccession,
        icon: "removeable",
        assayName: row.assay,
        children: [],
        allExpAccessions: [row.fileAccession],
      };
      sampleAssayMap.set(row.displayname + row.assay, expNode);
      displayNameNode.children!.push(expNode);
    }
    assayNode.allExpAccessions!.push(row.fileAccession);
    ontologyNode.allExpAccessions!.push(row.fileAccession);
    displayNameNode.allExpAccessions!.push(row.fileAccession);
    root.allRowInfo!.push(row);
  });
  // standardize the order of the assay folders everytime one is added
  root.children!.sort((a, b): number => {
    return assayTypes.indexOf(a.id) - assayTypes.indexOf(b.id);
  });
  return [root];
}

/**
 * Builds tree in the sorted by assay view
 * @param selectedIds: list of ids (from useSelectionStore)
 * @param root: Root TreeViewBaseItem
 * @param rowById: Mapping between an id (experimentAccession) and its RowInfo object
 * @returns all of the items for the RichTreeView in TreeViewWrapper
 */
export function buildTreeView(
  selectedIds: string[],
  root: TreeViewBaseItem<ExtendedTreeItemProps>,
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

  const selectedRows = selectedIds.reduce<RowInfo[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);

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
        id: row.fileAccession,
        label: row.fileAccession,
        icon: "removeable",
        assayName: row.assay,
        children: [],
        allExpAccessions: [row.fileAccession],
      };
      sampleAssayMap.set(row.displayname + row.assay, expNode);
      displayNameNode.children!.push(expNode);
    }
    ontologyNode.allExpAccessions!.push(row.fileAccession);
    displayNameNode.allExpAccessions!.push(row.fileAccession);
    root.allRowInfo!.push(row);
  });
  // standardize the order of the assay folders everytime one is added
  root.children!.sort((a, b): number => {
    return ontologyTypes.indexOf(a.id) - ontologyTypes.indexOf(b.id);
  });
  return [root];
}

/**
 * Fuzzy search of active tracks.
 *
 * @param treeItems - TreeBaseViewItems from the tree.
 * @param query - The search query string.
 * @param keyWeightMap - Array of keys to search within each track object.
 * Can look like ["name", "author"] or if weighted, [
    {
      name: 'title',
      weight: 0.3
    },
    {
      name: 'author',
      weight: 0.7
    }
  ].
 * @param threshold - (Optional) Threshold for the fuzzy search (default is 0.5).
 *                    Smaller = stricter match, larger = fuzzier since 0 is perfect match and 1 is worst match.
 * @param limit - (Optional) Maximum number of results to return (default is 10).
 * @returns FuseResult object containing the search results.
 */
export function searchTreeItems({
  treeItems,
  query,
  keyWeightMap,
  threshold,
  limit = 10
}: SearchTracksProps): FuseResult<RowInfo>[] {
  const data = treeItems![0].allRowInfo ?? [];
  const fuse = new Fuse(data, {
    includeScore: true,
    shouldSort: true,
    threshold: threshold,
    keys: keyWeightMap,
  });
  return fuse.search(query, { limit: limit });
}

/**
 * Creates the assay icon for DataGrid and RichTreeView
 * @param type: assay type
 * @returns an icon of the assay's respective color
 */
export function AssayIcon(type: string) {
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

// Everything below is styling for the custom directory look of the tree view
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
});

function CustomLabel({ icon: Icon, children, isAssayItem, assayName, ...other }: CustomLabelProps) {
  const variant = isAssayItem ? "subtitle2" : "body2";
  const fontWeight = isAssayItem ? "bold" : 500;
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
      <Stack direction="row" spacing={1} alignItems="center">
        {isAssayItem && AssayIcon(other.id)}
        {assayName && AssayIcon(assayName)}
        <TreeItemLabelText fontWeight={fontWeight} variant={variant}>{children}</TreeItemLabelText>
      </Stack>
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
  "&:hover": {
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
      return AssayIcon(itemType);
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
              expandable: (status.expandable && status.expanded).toString(),
              isAssayItem: item.isAssayItem,
              assayName: item.assayName,
              id: item.id
            })}
          />
        </TreeItemContent>
        {children && <Collapse {...getGroupTransitionProps()} />}
      </TreeItemRoot>
    </TreeItemProvider>
  );
});