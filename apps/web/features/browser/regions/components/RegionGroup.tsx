"use client";

import ChevronRight from "@mui/icons-material/ChevronRight";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LayersClearOutlined from "@mui/icons-material/LayersClearOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { useId, useState, type ReactNode } from "react";
import type { RegionGroup } from "../regionGroupSchema";
import type { RegionGroupStoreInstance } from "../regionGroups";
import { isHidden, setHidden } from "../regions";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { GroupDialog } from "./GroupDialog";

/** One column that can shrink below the cards' text, so long names and coordinates truncate. */
export const listSx = { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 1 } as const;

type RegionGroupSectionProps = {
  group: RegionGroup;
  browserStore: BrowserStoreInstance;
  regionGroupStore: RegionGroupStoreInstance;
  /** The members' cards, shown while the group is expanded. */
  children: ReactNode;
};

/**
 * A region group: a header chip in the group's color that collapses or expands it, and
 * while expanded its members, with the color running down their left side.
 */
export function RegionGroupSection({
  group,
  browserStore,
  regionGroupStore,
  children,
}: RegionGroupSectionProps) {
  const listId = useId();
  const theme = useTheme();
  const { collapsed, color } = group;

  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <ButtonBase
          aria-expanded={!collapsed}
          aria-controls={collapsed ? undefined : listId}
          onClick={() => regionGroupStore.getState().setCollapsed(group.id, !collapsed)}
          sx={{
            minWidth: 0,
            gap: 0.5,
            py: 0.5,
            pl: 0.5,
            pr: 1.25,
            bgcolor: color,
            color: theme.palette.getContrastText(color),
            // Square at the bottom left while expanded, where the color runs down the members.
            borderRadius: collapsed ? 2 : "8px 8px 8px 0",
            typography: "body2",
            fontWeight: "fontWeightMedium",
          }}
        >
          {collapsed ? <ChevronRight fontSize="small" /> : <ExpandMore fontSize="small" />}
          {/* One line, so a long name with spaces truncates as a whole. */}
          <Box
            component="span"
            sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {group.name}
          </Box>
          {collapsed ? (
            <Box component="span" sx={{ flexShrink: 0, opacity: 0.85, whiteSpace: "nowrap" }}>
              · {group.regionIds.length}
            </Box>
          ) : null}
        </ButtonBase>
        <Box sx={{ flexGrow: 1 }} />
        <GroupActions
          group={group}
          browserStore={browserStore}
          regionGroupStore={regionGroupStore}
        />
      </Box>
      {collapsed ? null : (
        <List
          id={listId}
          aria-label={group.name}
          disablePadding
          sx={{ ...listSx, borderLeft: 3, borderColor: color, pl: 1, pt: 1 }}
        >
          {children}
        </List>
      )}
    </ListItem>
  );
}

/** A group's more-actions button and menu: edit, hide or show its highlights, ungroup, delete. */
function GroupActions({
  group,
  browserStore,
  regionGroupStore,
}: Omit<RegionGroupSectionProps, "children">) {
  const useBrowserStore = browserStore;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuId = useId();
  const label = `Actions for group ${group.name}`;
  const close = () => setAnchor(null);
  const members = new Set(group.regionIds);
  const hidden = useBrowserStore((state) =>
    state.highlights.every((highlight) => !members.has(highlight.id) || isHidden(highlight)),
  );
  const { editGroup, ungroup, deleteGroup } = regionGroupStore.getState();

  function setMembersHidden(nextHidden: boolean) {
    for (const highlight of browserStore.getState().highlights)
      if (members.has(highlight.id)) setHidden(browserStore, highlight, nextHidden);
  }

  return (
    <>
      <IconButton
        size="small"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? "true" : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        slotProps={{ list: { dense: true, "aria-label": label } }}
      >
        <MenuItem
          onClick={() => {
            close();
            setEditing(true);
          }}
        >
          <ListItemIcon>
            <EditOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit group" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            setMembersHidden(!hidden);
          }}
        >
          <ListItemIcon>
            {hidden ? (
              <VisibilityOutlined fontSize="small" />
            ) : (
              <VisibilityOffOutlined fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText primary={hidden ? "Show highlights" : "Hide highlights"} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            ungroup(group.id);
          }}
        >
          <ListItemIcon>
            <LayersClearOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Ungroup" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            setDeleting(true);
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete group" />
        </MenuItem>
      </Menu>
      <GroupDialog
        open={editing}
        title="Edit group"
        submitLabel="Save"
        initial={group}
        onSubmit={(edit) => editGroup(group.id, edit)}
        onClose={() => setEditing(false)}
      />
      <ConfirmDeleteDialog
        open={deleting}
        title={`Delete “${group.name}”?`}
        text="The group and every region in it, with their highlights, will be removed from this session. To keep the regions, ungroup it instead."
        confirmLabel="Delete group"
        onConfirm={() => deleteGroup(group.id)}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}
