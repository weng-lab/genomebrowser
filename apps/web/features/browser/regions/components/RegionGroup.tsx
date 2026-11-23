"use client";

import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import Palette from "@mui/icons-material/Palette";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Divider from "@mui/material/Divider";
import { alpha, useTheme } from "@mui/material/styles";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { useId, useState, type ReactNode } from "react";
import type { RegionGroup } from "../regionGroupSchema";
import { groupColors, type RegionGroupStoreInstance } from "../regionGroups";
import { setRegionsColor, setRegionsHidden } from "../regions";
import { ActionsPopover } from "../../../../shared/ui/ActionsPopover";
import { NameAndColor } from "../../../../shared/ui/NameAndColor";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

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

/**
 * A group's more-actions button and menu: its name and color, which apply as they change,
 * then giving its regions its color, ungrouping it, and deleting it with its regions.
 */
function GroupActions({
  group,
  browserStore,
  regionGroupStore,
}: Omit<RegionGroupSectionProps, "children">) {
  const [deleting, setDeleting] = useState(false);
  const { editGroup, ungroup, deleteGroup } = regionGroupStore.getState();
  // From the store, so an edit keeps the other field's latest value.
  const edit = (change: Partial<Pick<RegionGroup, "name" | "color">>) => {
    const latest = regionGroupStore.getState().groups.find(({ id }) => id === group.id) ?? group;
    editGroup(group.id, { name: latest.name, color: latest.color, ...change });
  };
  const { color } = group;

  return (
    <>
      <ActionsPopover label={`Actions for group ${group.name}`}>
        {(close) => (
          <>
            <NameAndColor
              nameLabel="Group name"
              initialName={group.name}
              onRename={(name) => edit({ name })}
              onDone={close}
              color={{
                label: "Group color",
                colors: groupColors,
                value: color,
                onChange: (next) => edit({ color: next }),
                allowNone: true,
              }}
            />
            <MenuList dense aria-label={`Actions for group ${group.name}`} sx={{ pt: 0 }}>
              <MenuItem
                // Without a color, or regions to take it, there is nothing to apply.
                disabled={color === null || group.regionIds.length === 0}
                onClick={() => {
                  close();
                  if (color) setRegionsColor(browserStore, group.regionIds, color);
                }}
              >
                <ListItemIcon>
                  <Palette fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Apply color to all regions" />
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  close();
                  ungroup(group.id);
                }}
              >
                <ListItemText primary="Ungroup" />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  setDeleting(true);
                }}
                sx={{ color: "error.main" }}
              >
                <ListItemText primary="Delete group and regions" />
              </MenuItem>
            </MenuList>
          </>
        )}
      </ActionsPopover>
      <ConfirmDeleteDialog
        open={deleting}
        title={`Delete “${group.name}”?`}
        text="The group and every region in it, with their highlights, will be removed from this session. To keep the regions, ungroup it instead."
        confirmLabel="Delete group and regions"
        onConfirm={() => deleteGroup(group.id)}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}
