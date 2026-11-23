"use client";

import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import LayersClearOutlined from "@mui/icons-material/LayersClearOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { alpha, useTheme } from "@mui/material/styles";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { useId, useState, type ReactNode } from "react";
import type { RegionGroup } from "../regionGroupSchema";
import { groupColors, type RegionGroupStoreInstance } from "../regionGroups";
import { setRegionsColor, setRegionsHidden } from "../regions";
import { ColorPickerPopover } from "../../../../shared/ui/ColorPicker";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { GroupDialog } from "./GroupDialog";

/** One column that can shrink below the rows' text, so long names and coordinates truncate. */
export const listSx = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 0.5,
} as const;

type RegionGroupSectionProps = {
  group: RegionGroup;
  browserStore: BrowserStoreInstance;
  regionGroupStore: RegionGroupStoreInstance;
  /** The members' rows, shown while the group is expanded. */
  children: ReactNode;
};

/**
 * A region group: a row tinted with the group's color, or gray without one, whose chevron
 * and name collapse or expand it, then its region count, a button that hides or shows its
 * highlights, and its actions. While expanded, its members follow.
 */
export function RegionGroupSection({
  group,
  browserStore,
  regionGroupStore,
  children,
}: RegionGroupSectionProps) {
  const theme = useTheme();
  const { collapsed, color } = group;
  const count = group.regionIds.length;

  return (
    <CollapsibleSection
      label={group.name}
      expanded={!collapsed}
      onToggle={() => regionGroupStore.getState().setCollapsed(group.id, !collapsed)}
      tint={color ? alpha(color, 0.14) : theme.palette.action.hover}
      title={
        <>
          <Box
            component="span"
            sx={{
              minWidth: 0,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              bgcolor: color ?? "action.selected",
              color: color ? theme.palette.getContrastText(color) : "text.primary",
              typography: "body2",
              fontWeight: "fontWeightMedium",
              // One line, so a long name with spaces truncates as a whole.
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {group.name}
          </Box>
          <Count value={count} />
        </>
      }
      actions={
        <>
          <GroupVisibilityButton group={group} browserStore={browserStore} />
          <GroupActions
            group={group}
            browserStore={browserStore}
            regionGroupStore={regionGroupStore}
          />
        </>
      }
    >
      {count === 0 ? (
        <ListItem sx={{ px: 1.5, py: 0.75, typography: "body2", color: "text.secondary" }}>
          No regions in this group
        </ListItem>
      ) : (
        children
      )}
    </CollapsibleSection>
  );
}

/** The regions in no group, under a heading that collapses or expands them, below the groups. */
export function UngroupedSection({ count, children }: { count: number; children: ReactNode }) {
  // Not saved with the session, unlike groups: it is only a way to make room.
  const [expanded, setExpanded] = useState(true);
  return (
    <CollapsibleSection
      label="Ungrouped"
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
      title={
        <>
          <Box
            component="span"
            sx={{
              typography: "caption",
              fontWeight: "fontWeightMedium",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Ungrouped
          </Box>
          <Count value={count} />
        </>
      }
    >
      {children}
    </CollapsibleSection>
  );
}

type CollapsibleSectionProps = {
  /** The members list's accessible name. */
  label: string;
  expanded: boolean;
  onToggle: () => void;
  /** Shown after the chevron, inside the button that toggles the section. */
  title: ReactNode;
  /** Buttons at the header's right end. */
  actions?: ReactNode;
  /** The header's background. */
  tint?: string;
  children: ReactNode;
};

/**
 * A list item with a header that collapses or expands the rows under it. The chevron points
 * down while expanded and up while collapsed.
 */
function CollapsibleSection({
  label,
  expanded,
  onToggle,
  title,
  actions,
  tint,
  children,
}: CollapsibleSectionProps) {
  const listId = useId();
  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          minHeight: 40,
          pr: 0.25,
          borderRadius: 1.5,
          bgcolor: tint,
        }}
      >
        <ButtonBase
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          onClick={onToggle}
          sx={{
            flexGrow: 1,
            justifyContent: "flex-start",
            minWidth: 0,
            alignSelf: "stretch",
            gap: 0.75,
            pl: 0.75,
            borderRadius: 1.5,
          }}
        >
          {expanded ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowUp fontSize="small" />}
          {title}
        </ButtonBase>
        {actions}
      </Box>
      {expanded ? (
        <List id={listId} aria-label={label} disablePadding sx={{ ...listSx, pt: 0.5 }}>
          {children}
        </List>
      ) : null}
    </ListItem>
  );
}

function Count({ value }: { value: number }) {
  return (
    <Box component="span" sx={{ flexShrink: 0, typography: "body2", color: "text.secondary" }}>
      {value}
    </Box>
  );
}

/** Hides or shows every highlight in a group. They count as hidden once all of them are. */
function GroupVisibilityButton({
  group,
  browserStore,
}: {
  group: RegionGroup;
  browserStore: BrowserStoreInstance;
}) {
  const useBrowserStore = browserStore;
  const members = new Set(group.regionIds);
  const hidden = useBrowserStore(
    (state) =>
      members.size > 0 &&
      state.highlights.every((highlight) => !members.has(highlight.id) || highlight.hidden),
  );
  const label = `${hidden ? "Show" : "Hide"} highlights in ${group.name}`;
  return (
    <IconButton
      size="small"
      aria-label={label}
      title={label}
      disabled={members.size === 0}
      onClick={() => setRegionsHidden(browserStore, group.regionIds, !hidden)}
      sx={{ color: "primary.main" }}
    >
      {hidden ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
    </IconButton>
  );
}

/** A group's more-actions button and menu: edit, change its highlights' color, ungroup, delete. */
function GroupActions({
  group,
  browserStore,
  regionGroupStore,
}: Omit<RegionGroupSectionProps, "children">) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The actions button, while the highlight color picker is open below it.
  const [recoloring, setRecoloring] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const label = `Actions for group ${group.name}`;
  const close = () => setAnchor(null);
  const { editGroup, ungroup, deleteGroup } = regionGroupStore.getState();

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
            setRecoloring(anchor);
          }}
        >
          <ListItemIcon>
            <PaletteOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Change highlight color" />
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
      <ColorPickerPopover
        anchor={recoloring}
        // The group's color, so matching it is a single Apply.
        initialColor={group.color ?? groupColors[1].color}
        label="Highlight color"
        onApply={(color) => setRegionsColor(browserStore, group.regionIds, color)}
        onClose={() => setRecoloring(null)}
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
