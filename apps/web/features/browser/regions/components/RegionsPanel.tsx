"use client";

import Add from "@mui/icons-material/Add";
import CreateNewFolderOutlined from "@mui/icons-material/CreateNewFolderOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import RemoveCircleOutline from "@mui/icons-material/RemoveCircleOutline";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { alpha, type Theme } from "@mui/material/styles";
import {
  formatDisplayRegion,
  type BrowserStoreInstance,
  type Highlight,
} from "@weng-lab/genomebrowser";
import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSession } from "../../../sessions/SessionProvider";
import type { RegionGroup } from "../regionGroupSchema";
import { newGroupDefaults, type RegionGroupStoreInstance } from "../regionGroups";
import { isHidden, regionOf, sameRegion, saveRegion, setHidden } from "../regions";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { GroupDialog } from "./GroupDialog";
import { listSx, RegionGroupSection } from "./RegionGroup";
import { RegionDialog } from "./RegionDialog";

/**
 * The open session's saved regions: save the current view, go to, edit, hide, group, or
 * delete one, and delete them all. Groups collapse and expand.
 */
export function RegionsPanel() {
  const id = useSession((session) => session.active?.id);
  const stores = useSession((session) => session.active?.stores);
  if (!stores)
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
        Open a session to save regions.
      </Typography>
    );
  return (
    <Regions
      key={id}
      browserStore={stores.useBrowserStore}
      regionGroupStore={stores.useRegionGroupStore}
    />
  );
}

type StoresProps = {
  browserStore: BrowserStoreInstance;
  regionGroupStore: RegionGroupStoreInstance;
};

type Row = { group: RegionGroup; memberIds: string[] } | { id: string };

/**
 * The list's rows in highlight order. A group takes its first member's place, with all of
 * its members, in highlight order, under it.
 */
function rowsOf(ids: readonly string[], groups: readonly RegionGroup[]): Row[] {
  const groupOf = new Map(groups.flatMap((group) => group.regionIds.map((id) => [id, group])));
  const rows: Row[] = [];
  const placed = new Set<RegionGroup>();
  for (const id of ids) {
    const group = groupOf.get(id);
    if (!group) rows.push({ id });
    else if (!placed.has(group)) {
      placed.add(group);
      rows.push({ group, memberIds: ids.filter((member) => groupOf.get(member) === group) });
    }
  }
  return rows;
}

function Regions({ browserStore, regionGroupStore }: StoresProps) {
  const useBrowserStore = browserStore;
  const useRegionGroupStore = regionGroupStore;
  const ids = useBrowserStore(useShallow((state) => state.highlights.map(({ id }) => id)));
  const groups = useRegionGroupStore((state) => state.groups);
  const stores = { browserStore, regionGroupStore };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
      <Box sx={{ p: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<Add />}
          onClick={() => saveRegion(browserStore, browserStore.getState().region)}
          sx={panelButtonSx}
        >
          Save current region
        </Button>
      </Box>
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto", px: 1 }}>
        {ids.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
            No saved regions yet.
          </Typography>
        ) : (
          <List aria-label="Saved regions" disablePadding sx={listSx}>
            {rowsOf(ids, groups).map((row) =>
              "group" in row ? (
                <RegionGroupSection key={row.group.id} group={row.group} {...stores}>
                  {row.memberIds.map((id) => (
                    <RegionCard key={id} id={id} {...stores} />
                  ))}
                </RegionGroupSection>
              ) : (
                <RegionCard key={row.id} id={row.id} {...stores} />
              ),
            )}
          </List>
        )}
      </Box>
      <Box sx={{ px: 1, pt: 1 }}>
        <DeleteAllButton browserStore={browserStore} disabled={ids.length === 0} />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, py: 1.25 }}>
        Regions save with this session.
      </Typography>
    </Box>
  );
}

/** Deletes every saved region after asking, since it cannot be undone. */
function DeleteAllButton({
  browserStore,
  disabled,
}: {
  browserStore: BrowserStoreInstance;
  disabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const close = () => setConfirming(false);
  return (
    <>
      <Button
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<DeleteOutline />}
        disabled={disabled}
        onClick={() => setConfirming(true)}
        sx={panelButtonSx}
      >
        Delete all regions
      </Button>
      <ConfirmDeleteDialog
        open={confirming}
        title="Delete all regions?"
        text="Every saved region, its highlight, and every group will be removed from this session."
        confirmLabel="Delete all"
        // Groups follow the highlights, so clearing them deletes every group.
        onConfirm={() => browserStore.getState().clearHighlights()}
        onClose={close}
      />
    </>
  );
}

type RegionCardProps = StoresProps & { id: string };

/** A saved region: its color, name, and coordinates. Clicking it goes there. */
function RegionCard({ id, browserStore, regionGroupStore }: RegionCardProps) {
  const useBrowserStore = browserStore;
  const highlight = useBrowserStore((state) => state.highlights.find((item) => item.id === id));
  const shownChromosome = useBrowserStore((state) => state.region.chromosome);
  // A boolean, so panning re-renders only the cards it moves onto or off of.
  const current = useBrowserStore((state) => {
    const saved = state.highlights.find((item) => item.id === id);
    return (
      saved !== undefined && sameRegion(regionOf(saved, state.region.chromosome), state.region)
    );
  });
  if (!highlight) return null;
  const hidden = isHidden(highlight);
  const region = regionOf(highlight, shownChromosome);

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <RegionActions
          highlight={highlight}
          browserStore={browserStore}
          regionGroupStore={regionGroupStore}
        />
      }
      sx={{ "& .MuiListItemSecondaryAction-root": { right: 4 } }}
    >
      <ListItemButton
        selected={current}
        aria-current={current ? "location" : undefined}
        onClick={() => browserStore.getState().setRegion(region)}
        sx={cardSx}
      >
        <Swatch highlight={highlight} />
        <ListItemText
          primary={highlight.id}
          secondary={`${formatDisplayRegion(region)}${hidden ? " · Hidden" : ""}`}
          slotProps={{
            primary: {
              noWrap: true,
              sx: { fontWeight: "fontWeightMedium", color: current ? "primary.main" : undefined },
            },
            secondary: { noWrap: true, variant: "caption", display: "block" },
          }}
          sx={{ my: 0 }}
        />
      </ListItemButton>
    </ListItem>
  );
}

/** The highlight's color: filled or outlined like the highlight, and faded while hidden. */
function Swatch({ highlight }: { highlight: Highlight }) {
  const outlined = highlight.type === "outlined";
  return (
    <Box
      aria-hidden
      sx={{
        flexShrink: 0,
        width: 12,
        height: 12,
        mr: 1.25,
        borderRadius: 0.5,
        border: 2,
        borderColor: highlight.color,
        bgcolor: outlined ? "transparent" : highlight.color,
        opacity: isHidden(highlight) ? 0.35 : 1,
      }}
    />
  );
}

/**
 * A region's more-actions button and menu: edit, hide or show its highlight, add it to a
 * new or existing group or take it out of its group, and delete.
 */
function RegionActions({
  highlight,
  browserStore,
  regionGroupStore,
}: StoresProps & { highlight: Highlight }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [grouping, setGrouping] = useState(false);
  const menuId = useId();
  const label = `Actions for region ${highlight.id}`;
  const close = () => setAnchor(null);
  const hidden = isHidden(highlight);

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
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
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
          <ListItemText primary="Edit region" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            setHidden(browserStore, highlight, !hidden);
          }}
        >
          <ListItemIcon>
            {hidden ? (
              <VisibilityOutlined fontSize="small" />
            ) : (
              <VisibilityOffOutlined fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText primary={hidden ? "Show highlight" : "Hide highlight"} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            setGrouping(true);
          }}
        >
          <ListItemIcon>
            <CreateNewFolderOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Add to new group" />
        </MenuItem>
        {/* Only while the menu is open, so cards do not follow every group change. */}
        {anchor ? (
          <GroupMenuItems
            regionId={highlight.id}
            regionGroupStore={regionGroupStore}
            onChosen={close}
          />
        ) : null}
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            browserStore.getState().removeHighlight(highlight.id);
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>
      <RegionDialog
        browserStore={browserStore}
        highlight={highlight}
        open={editing}
        onClose={() => setEditing(false)}
      />
      <GroupDialog
        open={grouping}
        title="New group"
        submitLabel="Create group"
        initial={newGroupDefaults(regionGroupStore.getState().groups)}
        onSubmit={(group) => regionGroupStore.getState().addToNewGroup(highlight.id, group)}
        onClose={() => setGrouping(false)}
      />
    </>
  );
}

/**
 * The region menu's group items: the groups it can move to, each with its color, and
 * Remove from group while it is in one.
 */
function GroupMenuItems({
  regionId,
  regionGroupStore,
  onChosen,
}: {
  regionId: string;
  regionGroupStore: RegionGroupStoreInstance;
  onChosen: () => void;
}) {
  const useRegionGroupStore = regionGroupStore;
  const groups = useRegionGroupStore((state) => state.groups);
  const current = groups.find((group) => group.regionIds.includes(regionId));
  const others = groups.filter((group) => group !== current);
  const { addToGroup, removeFromGroup } = regionGroupStore.getState();
  return (
    <>
      {others.length > 0 ? (
        <ListSubheader sx={{ lineHeight: 2.5 }}>Add to group</ListSubheader>
      ) : null}
      {others.map((group) => (
        <MenuItem
          key={group.id}
          onClick={() => {
            onChosen();
            addToGroup(regionId, group.id);
          }}
        >
          <ListItemIcon>
            <Box
              aria-hidden
              sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: group.color, ml: 0.5 }}
            />
          </ListItemIcon>
          <ListItemText primary={group.name} slotProps={{ primary: { noWrap: true } }} />
        </MenuItem>
      ))}
      {current ? (
        <MenuItem
          onClick={() => {
            onChosen();
            removeFromGroup(regionId);
          }}
        >
          <ListItemIcon>
            <RemoveCircleOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={`Remove from ${current.name}`} />
        </MenuItem>
      ) : null}
    </>
  );
}

/** The panel's full-width buttons: quiet borders and sentence-case labels. */
const panelButtonSx = {
  borderColor: "divider",
  borderRadius: 2,
  textTransform: "none",
  fontWeight: "fontWeightMedium",
} as const;

/** A bordered card, tinted with the primary color while the view shows its region. */
const cardSx = {
  alignItems: "center",
  py: 1,
  pl: 1.5,
  // Room for the actions button.
  pr: 5,
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
  "&.Mui-selected": {
    borderColor: "primary.main",
    bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.06),
  },
} as const;
