import FolderIcon from "@mui/icons-material/Folder";
import IndeterminateCheckBoxRoundedIcon from "@mui/icons-material/IndeterminateCheckBoxRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import type { SelectedTreeNode } from "./buildSelectedTree";

type SelectedTreeItemProps = {
  node: SelectedTreeNode;
  onRemove: (trackIds: string[]) => void;
};

export function SelectedTreeItem({ node, onRemove }: SelectedTreeItemProps) {
  return (
    <TreeItem
      itemId={node.id}
      label={<TreeItemLabel node={node} onRemove={onRemove} />}
    >
      {node.children?.map((child) => (
        <SelectedTreeItem key={child.id} node={child} onRemove={onRemove} />
      ))}
    </TreeItem>
  );
}

function TreeItemLabel({
  node,
  onRemove,
}: {
  node: SelectedTreeNode;
  onRemove: (trackIds: string[]) => void;
}) {
  const removable = node.kind !== "root";

  return (
    <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, gap: 1 }}>
      {removable ? (
        <IconButton
          aria-label={`Remove ${node.label}`}
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(node.trackIds);
          }}
          sx={{ p: 0.25, borderRadius: 1 }}
        >
          <IndeterminateCheckBoxRoundedIcon fontSize="small" />
        </IconButton>
      ) : (
        <FolderIcon fontSize="small" />
      )}
      <Tooltip title={node.label} enterDelay={500} placement="top">
        <Typography
          variant="body2"
          fontWeight={500}
          sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {node.label}
        </Typography>
      </Tooltip>
    </Box>
  );
}
