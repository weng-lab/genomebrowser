import { useState, type ReactNode } from "react";
import { Box, MenuItem, Select, Stack, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { NavigationButton } from "./navigationButton";
import { LabeledGroup } from "../LabeledGroup/labeledGroup";

export type NavigationControlsProps = {
  browserStore: BrowserStoreInstance;
  navigationActions?: ReactNode;
};

const groupSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  "& button": { minWidth: 32, px: 0.5, height: 32 },
  "& .MuiInputBase-root": { height: 32, fontSize: "0.8125rem" },
};

export function NavigationControls({ browserStore, navigationActions }: NavigationControlsProps) {
  const [pan, setPan] = useState(0.25);
  const [zoom, setZoom] = useState(3);
  const [openMagnitude, setOpenMagnitude] = useState<"pan" | "zoom" | null>(null);
  return (
    <LabeledGroup title="Navigate">
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Box role="group" aria-label="Pan controls" sx={groupSx}>
          <Tooltip title="Pan left by the selected percentage" describeChild>
            <span style={{ display: "inline-flex" }}>
              <NavigationButton
                browserStore={browserStore}
                action={{ type: "pan", fraction: -pan }}
                aria-label="Pan left"
                variant="outlined"
                size="small"
              >
                <ArrowBackIcon fontSize="small" />
              </NavigationButton>
            </span>
          </Tooltip>
          <Tooltip title={openMagnitude === "pan" ? "" : "Choose how far to pan"} describeChild>
            <Select
              value={pan}
              onOpen={() => setOpenMagnitude("pan")}
              onClose={() => setOpenMagnitude(null)}
              renderValue={(value) => `${value * 100}%`}
              onChange={(e) => setPan(Number(e.target.value))}
              inputProps={{ "aria-label": "Pan magnitude" }}
              size="small"
            >
              <MenuItem value={0.25}>25%</MenuItem>
              <MenuItem value={0.5}>50%</MenuItem>
              <MenuItem value={1}>100%</MenuItem>
            </Select>
          </Tooltip>

          <Tooltip title="Pan right by the selected percentage" describeChild>
            <span style={{ display: "inline-flex" }}>
              <NavigationButton
                browserStore={browserStore}
                action={{ type: "pan", fraction: pan }}
                aria-label="Pan right"
                variant="outlined"
                size="small"
              >
                <ArrowForwardIcon fontSize="small" />
              </NavigationButton>
            </span>
          </Tooltip>
        </Box>
        <Box role="group" aria-label="Zoom controls" sx={groupSx}>
          <Tooltip title="Zoom out by the selected factor" describeChild>
            <span style={{ display: "inline-flex" }}>
              <NavigationButton
                browserStore={browserStore}
                action={{ type: "zoom", factor: zoom }}
                aria-label="Zoom out"
                variant="outlined"
                size="small"
              >
                <RemoveIcon fontSize="small" />
              </NavigationButton>
            </span>
          </Tooltip>
          <Tooltip title={openMagnitude === "zoom" ? "" : "Choose the zoom factor"} describeChild>
            <Select
              value={zoom}
              onOpen={() => setOpenMagnitude("zoom")}
              onClose={() => setOpenMagnitude(null)}
              onChange={(e) => setZoom(Number(e.target.value))}
              inputProps={{ "aria-label": "Zoom magnitude" }}
              size="small"
            >
              {[1.5, 3, 10].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}X
                </MenuItem>
              ))}
            </Select>
          </Tooltip>

          <Tooltip title="Zoom in by the selected factor" describeChild>
            <span style={{ display: "inline-flex" }}>
              <NavigationButton
                browserStore={browserStore}
                action={{ type: "zoom", factor: 1 / zoom }}
                aria-label="Zoom in"
                variant="outlined"
                size="small"
              >
                <AddIcon fontSize="small" />
              </NavigationButton>
            </span>
          </Tooltip>
        </Box>
        {navigationActions}
      </Stack>
    </LabeledGroup>
  );
}
