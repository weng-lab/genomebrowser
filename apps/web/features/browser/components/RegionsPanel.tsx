"use client";

import Add from "@mui/icons-material/Add";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
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
import { useSession } from "../../sessions/SessionProvider";
import { isHidden, regionOf, sameRegion, saveRegion, setHidden } from "../regions";
import { RegionDialog } from "./RegionDialog";

/**
 * The open session's saved regions: save the current view, go to, edit, hide, or delete
 * one, and delete them all.
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
  return <Regions key={id} browserStore={stores.useBrowserStore} />;
}

function Regions({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const useBrowserStore = browserStore;
  const ids = useBrowserStore(useShallow((state) => state.highlights.map(({ id }) => id)));

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
            {ids.map((id) => (
              <RegionCard key={id} id={id} browserStore={browserStore} />
            ))}
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
      <Dialog open={confirming} onClose={close} maxWidth="xs">
        <DialogTitle>Delete all regions?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Every saved region and its highlight will be removed from this session.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={close}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              close();
              browserStore.getState().clearHighlights();
            }}
          >
            Delete all
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

type RegionCardProps = { id: string; browserStore: BrowserStoreInstance };

/** A saved region: its color, name, and coordinates. Clicking it goes there. */
function RegionCard({ id, browserStore }: RegionCardProps) {
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
      secondaryAction={<RegionActions highlight={highlight} browserStore={browserStore} />}
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

/** A region's more-actions button and menu: edit, hide or show its highlight, and delete. */
function RegionActions({
  highlight,
  browserStore,
}: {
  highlight: Highlight;
  browserStore: BrowserStoreInstance;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
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
    </>
  );
}

/** One column that can shrink below the cards' text, so long names and coordinates truncate. */
const listSx = { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 1 } as const;

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
