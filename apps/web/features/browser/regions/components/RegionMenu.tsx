"use client";

import ChevronRight from "@mui/icons-material/ChevronRight";
import CreateNewFolder from "@mui/icons-material/CreateNewFolder";
import EditNote from "@mui/icons-material/EditNote";
import Folder from "@mui/icons-material/Folder";
import FolderOff from "@mui/icons-material/FolderOff";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import type { BrowserStoreInstance, Highlight } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { ActionsPopover } from "../../../../shared/ui/ActionsPopover";
import { NameAndColor } from "../../../../shared/ui/NameAndColor";
import type { RegionGroup } from "../regionGroupSchema";
import type { RegionGroupStoreInstance } from "../regionGroups";
import {
  moveRegion,
  regionColors,
  regionName,
  regionOf,
  renameRegion,
  setRegionColor,
  setRegionsHidden,
} from "../regions";
import { CoordinateFields, isOpen, useCoordinates } from "./CoordinateFields";

type RegionMenuProps = {
  highlight: Highlight;
  browserStore: BrowserStoreInstance;
  regionGroupStore: RegionGroupStoreInstance;
  /** Opens a new group around the region, returning focus to `opener` when it closes. */
  onAddToNewGroup: (regionId: string, opener: HTMLElement) => void;
};

/** A region's more-actions button, which opens its menu. */
export function RegionActions(props: RegionMenuProps) {
  return (
    <ActionsPopover label={`Actions for region ${regionName(props.highlight)}`}>
      {(close, opener) => <RegionMenu {...props} opener={opener} onClose={close} />}
    </ActionsPopover>
  );
}

/**
 * The region's menu: its name and color, which apply as they change, then editing its
 * coordinates, hiding it, moving it between groups, and deleting it. Choosing the dotted
 * color hides it as well.
 */
function RegionMenu({
  highlight,
  browserStore,
  regionGroupStore,
  onAddToNewGroup,
  opener,
  onClose,
}: RegionMenuProps & { opener: HTMLElement | null; onClose: () => void }) {
  const useBrowserStore = browserStore;
  const useRegionGroupStore = regionGroupStore;
  const shownChromosome = useBrowserStore((state) => state.region.chromosome);
  const groups = useRegionGroupStore((state) => state.groups);
  const current = groups.find((group) => group.regionIds.includes(highlight.id));
  const [groupMenu, setGroupMenu] = useState<HTMLElement | null>(null);
  const coordinates = useCoordinates();
  const hidden = highlight.hidden === true;
  const act = (action: () => void) => () => {
    onClose();
    action();
  };

  if (isOpen(coordinates))
    return (
      <Box
        component="form"
        aria-label="Edit coordinates"
        onSubmit={(event) => {
          event.preventDefault();
          const region = coordinates.read(browserStore.getState().assembly);
          if (!region) return;
          const result = moveRegion(browserStore, highlight.id, region);
          if (result.ok) onClose();
          else coordinates.fail("end", result.error);
        }}
      >
        <CoordinateFields coordinates={coordinates} onCancel={coordinates.close} framed={false} />
      </Box>
    );

  return (
    <>
      <NameAndColor
        nameLabel="Region name"
        initialName={regionName(highlight)}
        onRename={(name) => renameRegion(browserStore, highlight.id, name)}
        onDone={onClose}
        color={{
          label: "Region color",
          colors: regionColors,
          value: hidden ? null : highlight.color,
          onChange: (color) => setRegionColor(browserStore, highlight.id, color),
          allowNone: true,
          noneLabel: "Hidden",
        }}
      />
      <Divider />
      <MenuList dense aria-label={`Actions for region ${regionName(highlight)}`}>
        <MenuItem onClick={() => coordinates.open(regionOf(highlight, shownChromosome))}>
          <ListItemIcon>
            <EditNote fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit coordinates" />
        </MenuItem>
        <MenuItem onClick={act(() => setRegionsHidden(browserStore, [highlight.id], !hidden))}>
          <ListItemIcon>
            {hidden ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
          </ListItemIcon>
          <ListItemText primary={hidden ? "Show on tracks" : "Hide on tracks"} />
        </MenuItem>
        <Divider />
        <MenuItem
          aria-haspopup="menu"
          aria-expanded={groupMenu ? "true" : undefined}
          onClick={(event) => setGroupMenu(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") setGroupMenu(event.currentTarget);
          }}
        >
          <ListItemIcon>
            <Folder fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Move to group" />
          <ChevronRight fontSize="small" sx={{ color: "text.secondary", mr: -0.5 }} />
        </MenuItem>
        {current ? (
          <MenuItem onClick={act(() => regionGroupStore.getState().removeFromGroup(highlight.id))}>
            <ListItemIcon>
              <FolderOff fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Remove from group" />
          </MenuItem>
        ) : null}
        <Divider />
        <MenuItem
          onClick={act(() => browserStore.getState().removeHighlight(highlight.id))}
          sx={{ color: "error.main" }}
        >
          <ListItemText primary="Delete" />
        </MenuItem>
      </MenuList>
      <Menu
        anchorEl={groupMenu}
        open={groupMenu !== null}
        onClose={() => setGroupMenu(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        onKeyDown={(event) => {
          // ArrowLeft goes back to the item that opened the groups.
          if (event.key === "ArrowLeft") setGroupMenu(null);
        }}
        slotProps={{
          list: { dense: true, "aria-label": "Move to group" },
          paper: { sx: { minWidth: 220, borderRadius: 3 } },
        }}
      >
        {groups
          .filter((group) => group !== current)
          .map((group) => (
            <MenuItem
              key={group.id}
              onClick={act(() => regionGroupStore.getState().addToGroup(highlight.id, group.id))}
            >
              <ListItemIcon>
                <GroupDot group={group} />
              </ListItemIcon>
              <ListItemText primary={group.name} slotProps={{ primary: { noWrap: true } }} />
            </MenuItem>
          ))}
        {groups.some((group) => group !== current) ? <Divider /> : null}
        <MenuItem onClick={act(() => opener && onAddToNewGroup(highlight.id, opener))}>
          <ListItemIcon>
            <CreateNewFolder fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Move to new group" />
        </MenuItem>
      </Menu>
    </>
  );
}

/** A group's color as a dot, or a dotted ring for a group with none, as its picker shows it. */
function GroupDot({ group }: { group: RegionGroup }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        ml: 0.25,
        ...(group.color
          ? { bgcolor: group.color }
          : { border: 1.5, borderStyle: "dotted", borderColor: "text.secondary" }),
      }}
    />
  );
}
