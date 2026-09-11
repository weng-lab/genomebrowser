import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  Box,
  Button,
  ButtonBase,
  ClickAwayListener,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import HighlightIcon from "@mui/icons-material/Highlight";
import LayersIcon from "@mui/icons-material/Layers";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { BrowserNavigationButton } from "../BrowserNavigationButton/browserNavigationButton";
import { BrowserSelectionControls } from "../BrowserSelectionControls/browserSelectionControls";
import { type Result, GenomeSearch } from "@weng-lab/ui-components";

export type BrowserToolbarProps = {
  browserStore: BrowserStoreInstance;
  search: Pick<ComponentProps<typeof GenomeSearch>, "assembly" | "graphqlUrl" | "queries">;
  onManageHighlights?: () => void;
  onSelectTracks?: () => void;
};

function Section({
  title,
  children,
  grow = false,
}: {
  title: string;
  children: ReactNode;
  grow?: boolean;
}) {
  return (
    <Box
      component="fieldset"
      sx={{
        m: 0,
        minWidth: 0,
        px: 1.25,
        pb: 1,
        pt: 0.5,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        flex: grow ? "1 1 240px" : "0 1 auto",
        maxWidth: grow ? 440 : "100%",
        boxSizing: "border-box",
      }}
    >
      <Typography component="legend" variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function RegionControl({
  browserStore: useBrowserStore,
  search,
}: Pick<BrowserToolbarProps, "browserStore" | "search">) {
  const region = useBrowserStore((s) => s.region);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const displayRef = useRef<HTMLButtonElement>(null);
  const coordinates = `${region.chromosome}:${region.start.toLocaleString("en-US")}-${region.end.toLocaleString("en-US")}`;
  const span = `${(region.end - region.start).toLocaleString("en-US")} bp`;
  function closeEditor(restoreFocus: boolean) {
    setEditing(false);
    if (restoreFocus) requestAnimationFrame(() => displayRef.current?.focus());
  }
  function submit(result: Result) {
    if (!result.domain) return;
    useBrowserStore.getState().setRegion(result.domain);
    closeEditor(true);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${region.chromosome}:${region.start}-${region.end}`);
      setMessage("Region copied");
    } catch {
      setMessage("Could not copy. Click the region to edit or select coordinates.");
    }
  }
  return (
    <ClickAwayListener onClickAway={() => closeEditor(false)}>
      <Box
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            closeEditor(true);
          }
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ height: 32 }}>
          {editing ? (
            <GenomeSearch
              {...search}
              onSearchSubmit={submit}
              size="small"
              sx={{
                flex: "1 1 0",
                width: "100%",
                minWidth: 0,
                "& .MuiAutocomplete-root": { minWidth: 0, width: "100%" },
              }}
              slots={{ button: IconButton }}
              slotProps={{
                input: {
                  autoFocus: true,
                  label: `${coordinates} · ${span}`,
                  placeholder: "Region, gene, SNP or cCRE",
                  slotProps: { inputLabel: { shrink: true } },
                  sx: { minWidth: 0, "& .MuiInputBase-root": { height: 32 } },
                },
                button: {
                  "aria-label": "Go to search result",
                  children: <SearchIcon fontSize="small" />,
                },
              }}
            />
          ) : (
            <ButtonBase
              ref={displayRef}
              onClick={() => setEditing(true)}
              aria-label={`Edit region ${coordinates}`}
              sx={{
                flex: 1,
                overflow: "hidden",
                minWidth: 0,
                justifyContent: "flex-start",
                borderRadius: 0.5,
                px: 0.5,
                py: 0.25,
                "&:hover": { bgcolor: "action.hover" },
                "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  flexWrap: "nowrap",
                  columnGap: 1,
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {coordinates}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {span}
                </Typography>
              </Box>
              <SearchIcon
                fontSize="small"
                sx={{ ml: "auto", pl: 0.5, flexShrink: 0, color: "text.secondary" }}
              />
            </ButtonBase>
          )}
          {editing ? (
            <IconButton
              size="small"
              aria-label="Cancel region search"
              onClick={() => closeEditor(true)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : null}
          <Tooltip title="Copy current region">
            <IconButton size="small" aria-label="Copy current region" onClick={() => void copy()}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Snackbar
          open={Boolean(message)}
          message={message}
          autoHideDuration={3000}
          onClose={() => setMessage("")}
        />
      </Box>
    </ClickAwayListener>
  );
}

const groupSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  "& button": { minWidth: 32, px: 0.5, height: 32 },
  "& .MuiInputBase-root": { height: 32, fontSize: "0.8125rem" },
};

function Navigation({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const [pan, setPan] = useState(0.25);
  const [zoom, setZoom] = useState(3);
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <Box role="group" aria-label="Pan controls" sx={groupSx}>
        <BrowserNavigationButton
          browserStore={browserStore}
          action={{ type: "pan", fraction: -pan }}
          aria-label="Pan left"
          variant="outlined"
          size="small"
        >
          <ArrowBackIcon fontSize="small" />
        </BrowserNavigationButton>
        <Select
          value={pan}
          renderValue={(value) => `${value * 100}%`}
          onChange={(e) => setPan(Number(e.target.value))}
          inputProps={{ "aria-label": "Pan magnitude" }}
          size="small"
        >
          <MenuItem value={0.25}>25%</MenuItem>
          <MenuItem value={0.5}>50%</MenuItem>
          <MenuItem value={1}>100%</MenuItem>
        </Select>

        <BrowserNavigationButton
          browserStore={browserStore}
          action={{ type: "pan", fraction: pan }}
          aria-label="Pan right"
          variant="outlined"
          size="small"
        >
          <ArrowForwardIcon fontSize="small" />
        </BrowserNavigationButton>
      </Box>
      <Box role="group" aria-label="Zoom controls" sx={groupSx}>
        <BrowserNavigationButton
          browserStore={browserStore}
          action={{ type: "zoom", factor: zoom }}
          aria-label="Zoom out"
          variant="outlined"
          size="small"
        >
          <RemoveIcon fontSize="small" />
        </BrowserNavigationButton>
        <Select
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          inputProps={{ "aria-label": "Zoom magnitude" }}
          size="small"
        >
          {[1.5, 3, 10].map((value) => (
            <MenuItem key={value} value={value}>
              {value}×
            </MenuItem>
          ))}
        </Select>

        <BrowserNavigationButton
          browserStore={browserStore}
          action={{ type: "zoom", factor: 1 / zoom }}
          aria-label="Zoom in"
          variant="outlined"
          size="small"
        >
          <AddIcon fontSize="small" />
        </BrowserNavigationButton>
      </Box>
    </Stack>
  );
}

export function BrowserToolbar({
  browserStore,
  search,
  onManageHighlights,
  onSelectTracks,
}: BrowserToolbarProps) {
  return (
    <Box
      aria-label="Genome browser controls"
      role="group"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 1,
        "& button": { textTransform: "none" },
      }}
    >
      <Section title="Region" grow>
        <RegionControl browserStore={browserStore} search={search} />
      </Section>
      <Section title="Navigate">
        <Navigation browserStore={browserStore} />
      </Section>
      <Section title="Interaction">
        <Box sx={{ "& .MuiToggleButton-root": { height: 32, px: 1 } }}>
          <BrowserSelectionControls browserStore={browserStore} />
        </Box>
      </Section>
      {onManageHighlights || onSelectTracks ? (
        <Section title="Manage">
          <Stack direction="row" spacing={0.5}>
            {onManageHighlights ? (
              <Button
                size="small"
                startIcon={<HighlightIcon fontSize="small" />}
                onClick={onManageHighlights}
              >
                Highlights
              </Button>
            ) : null}
            {onSelectTracks ? (
              <Button
                size="small"
                startIcon={<LayersIcon fontSize="small" />}
                onClick={onSelectTracks}
              >
                Tracks
              </Button>
            ) : null}
          </Stack>
        </Section>
      ) : null}
    </Box>
  );
}
