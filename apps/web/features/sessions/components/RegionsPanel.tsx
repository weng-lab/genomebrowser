"use client";

import Add from "@mui/icons-material/Add";
import EditLocationAltOutlined from "@mui/icons-material/EditLocationAltOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import Search from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import {
  formatDisplayRegion,
  parseDisplayRegion,
  type BrowserStoreInstance,
  type GenomicRegion,
} from "@weng-lab/genomebrowser";
import { HighlightDialog } from "@weng-lab/genomebrowser-ui";
import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSession } from "../SessionProvider";

/** The active session's saved regions use its highlights as their single source of truth. */
export function RegionsPanel() {
  const id = useSession((session) => session.active?.id);
  const stores = useSession((session) => session.active?.stores);
  return stores ? (
    <SavedRegions key={id} browserStore={stores.useBrowserStore} />
  ) : (
    <Typography sx={{ p: 1.5 }} variant="body2" color="text.secondary">
      Open a session to save regions.
    </Typography>
  );
}

function SessionLabel() {
  const name = useSession((session) => session.active?.name);
  return (
    <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
      {name}
    </Typography>
  );
}

function SavedRegions({ browserStore: useBrowserStore }: { browserStore: BrowserStoreInstance }) {
  const [filter, setFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterId = useId();
  const [editing, setEditing] = useState<{ id?: string }>();
  const [error, setError] = useState<string>();
  const ids = useBrowserStore(
    useShallow((state) =>
      state.highlights
        .filter((highlight) => {
          if (highlight.transient) return false;
          const coordinates = formatDisplayRegion({
            ...highlight.region,
            chromosome: highlight.region.chromosome ?? state.region.chromosome,
          });
          return `${highlight.id} ${coordinates}`
            .toLowerCase()
            .includes(filter.trim().toLowerCase());
        })
        .map(({ id }) => id),
    ),
  );

  function saveCurrentRegion() {
    const state = useBrowserStore.getState();
    const baseId = formatDisplayRegion(state.region);
    let id = baseId;
    for (let suffix = 2; state.highlights.some((highlight) => highlight.id === id); suffix++)
      id = `${baseId} (${suffix})`;
    const result = state.addHighlight({
      id,
      region: { ...state.region },
      ...state.selectionHighlight,
    });
    setError(result.ok ? undefined : result.error);
    setFilter("");
  }

  return (
    <>
      <Stack spacing={1} sx={{ p: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SessionLabel />
          <Stack
            direction="row"
            spacing={0.5}
            role="group"
            aria-label="Region actions"
            sx={{ flexShrink: 0 }}
          >
            <Tooltip title="Save current region">
              <IconButton size="small" aria-label="Save current region" onClick={saveCurrentRegion}>
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Filter regions">
              <IconButton
                size="small"
                aria-label="Filter regions"
                aria-expanded={filterOpen}
                aria-controls={filterOpen ? filterId : undefined}
                color={filterOpen ? "primary" : "default"}
                onClick={() => {
                  setFilterOpen(!filterOpen);
                  if (filterOpen) setFilter("");
                }}
              >
                <Search fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add region by coordinates">
              <IconButton
                size="small"
                aria-label="Add region by coordinates"
                onClick={() => setEditing({})}
              >
                <EditLocationAltOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        {filterOpen && (
          <TextField
            id={filterId}
            autoFocus
            label="Filter regions"
            size="small"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        )}
        {error && (
          <Typography role="alert" color="error" variant="body2">
            {error}
          </Typography>
        )}
      </Stack>
      <List
        aria-label="Saved regions"
        dense
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 0.5 }}
      >
        {ids.map((id) => (
          <RegionRow key={id} id={id} browserStore={useBrowserStore} onEdit={setEditing} />
        ))}
        {ids.length === 0 && (
          <ListItem>
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
              {filter
                ? "No matching regions."
                : "Save the current region or draw a highlight to start."}
            </Typography>
          </ListItem>
        )}
      </List>
      {editing && (
        <HighlightDialog
          browserStore={useBrowserStore}
          open
          initialEditingId={editing.id}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}

function RegionRow({
  id,
  browserStore: useBrowserStore,
  onEdit,
}: {
  id: string;
  browserStore: BrowserStoreInstance;
  onEdit: (editing: { id: string }) => void;
}) {
  const highlight = useBrowserStore((state) => state.highlights.find((item) => item.id === id));
  const chromosome = useBrowserStore(
    (state) => highlight?.region.chromosome ?? state.region.chromosome,
  );
  const selected = useBrowserStore(
    (state) =>
      highlight !== undefined &&
      (highlight.region.chromosome ?? state.region.chromosome) === state.region.chromosome &&
      highlight.region.start === state.region.start &&
      highlight.region.end === state.region.end,
  );
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [error, setError] = useState<string>();
  if (!highlight) return null;
  const region = { ...highlight.region, chromosome };
  const coordinates = formatDisplayRegion(region);
  return (
    <ListItem disablePadding sx={{ display: "block", mb: 0.75 }}>
      <Box
        sx={(theme) => ({
          display: "flex",
          alignItems: "flex-start",
          border: "1px solid",
          borderColor: selected ? "primary.main" : "divider",
          borderRadius: 1.5,
          bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : "background.paper",
          "&:hover": {
            bgcolor: selected ? alpha(theme.palette.primary.main, 0.12) : "action.hover",
          },
        })}
      >
        <Checkbox
          size="small"
          sx={{
            p: 1,
            mt: 0.75,
            color: highlight.color,
            "&.Mui-checked": { color: highlight.color },
          }}
          icon={
            <Box
              component="span"
              sx={{ width: 11, height: 11, border: "1px solid currentColor", borderRadius: "1px" }}
            />
          }
          checkedIcon={
            <Box
              component="span"
              sx={{
                width: 11,
                height: 11,
                bgcolor: "currentColor",
                border: "1px solid currentColor",
                borderRadius: "1px",
              }}
            />
          }
          checked={highlight.visible !== false}
          slotProps={{ input: { "aria-label": `Show highlight for ${id}` } }}
          onChange={(_, visible) => {
            useBrowserStore.setState((state) => ({
              highlights: state.highlights.map((item) =>
                item.id === id ? { ...item, visible } : item,
              ),
            }));
          }}
        />
        <ListItemButton
          selected={selected}
          aria-current={selected ? "location" : undefined}
          sx={{
            minWidth: 0,
            minHeight: 58,
            px: 0.5,
            py: 0.75,
            "&:hover, &.Mui-selected, &.Mui-selected:hover": { bgcolor: "transparent" },
            "&.Mui-focusVisible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: -2,
            },
          }}
          onClick={() => {
            const result = useBrowserStore.getState().setRegion(region);
            setError(result.ok ? undefined : result.error);
          }}
        >
          <ListItemText
            sx={{ my: 0 }}
            primary={id}
            secondary={
              id === coordinates || matchesRegionTitle(id, region) ? undefined : coordinates
            }
            slotProps={{
              primary: {
                sx: {
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  color: selected ? "primary.main" : "text.primary",
                  overflowWrap: "anywhere",
                },
              },
              secondary: {
                title: coordinates,
                noWrap: true,
                sx: {
                  mt: 0.5,
                  fontSize: "0.6875rem",
                  lineHeight: 1.4,
                  color: "text.secondary",
                  overflowWrap: "anywhere",
                },
              },
            }}
          />
        </ListItemButton>
        <IconButton
          size="small"
          aria-label={`Actions for ${id}`}
          sx={{ p: 0.5, mt: 0.5, mr: 0.5, color: "text.secondary" }}
          aria-haspopup="menu"
          aria-expanded={anchor !== null}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>
      {error && (
        <Typography role="alert" variant="body2" color="error">
          {error}
        </Typography>
      )}
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onEdit({ id });
          }}
        >
          Edit region
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            useBrowserStore.getState().removeHighlight(id);
          }}
        >
          Delete region
        </MenuItem>
      </Menu>
    </ListItem>
  );
}

/** Treat one-base boundary differences as duplicate coordinate labels. */
function matchesRegionTitle(title: string, region: GenomicRegion): boolean {
  try {
    const named = parseDisplayRegion(title);
    return (
      named.chromosome === region.chromosome &&
      Math.abs(named.start - region.start) <= 1 &&
      Math.abs(named.end - region.end) <= 1
    );
  } catch {
    // Named highlights still need their coordinate subtext.
    return false;
  }
}
