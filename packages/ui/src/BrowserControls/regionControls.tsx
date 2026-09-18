import { useRef, useState, type ComponentProps } from "react";
import {
  Box,
  ButtonBase,
  ClickAwayListener,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { type Result, GenomeSearch } from "@weng-lab/ui-components";
import { LabeledGroup } from "../LabeledGroup/labeledGroup";

export type RegionControlsProps = {
  browserStore: BrowserStoreInstance;
  search: Pick<ComponentProps<typeof GenomeSearch>, "assembly" | "graphqlUrl" | "queries">;
};

export function RegionControls({ browserStore: useBrowserStore, search }: RegionControlsProps) {
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
    const mutation = useBrowserStore.getState().setRegion(result.domain);
    if (!mutation.ok) {
      setMessage(mutation.error);
      return;
    }
    setMessage("");
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
    <LabeledGroup title="Region" sx={{ flex: "1 1 240px", maxWidth: 440 }}>
      <ClickAwayListener onClickAway={() => closeEditor(false)}>
        <Box
          onKeyDown={(event) => {
            if (editing && event.key === "Escape") {
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
              <Tooltip title="Click to search for a new region" describeChild>
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
              </Tooltip>
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
    </LabeledGroup>
  );
}
