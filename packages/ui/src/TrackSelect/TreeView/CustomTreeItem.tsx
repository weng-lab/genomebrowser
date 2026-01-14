import Folder from "@mui/icons-material/Folder";
import IndeterminateCheckBoxRoundedIcon from "@mui/icons-material/IndeterminateCheckBoxRounded";
import { Box, Stack, Typography } from "@mui/material";
import Collapse from "@mui/material/Collapse";
import { alpha, styled } from "@mui/material/styles";
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
import { AssayIcon } from "../folders/biosamples/shared/constants";
import {
  CustomLabelProps,
  CustomTreeItemProps,
  ExtendedTreeItemProps,
} from "../types";

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

function CustomLabel({
  icon: Icon,
  children,
  isAssayItem,
  assayName,
  ...other
}: CustomLabelProps) {
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
        <TreeItemLabelText fontWeight={fontWeight} variant={variant}>
          {children}
        </TreeItemLabelText>
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
              id: item.id,
            })}
          />
        </TreeItemContent>
        {children && <Collapse {...getGroupTransitionProps()} />}
      </TreeItemRoot>
    </TreeItemProvider>
  );
});
