"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import {
  createBrowserStore,
  createTrackStore,
  hg38,
  type BrowserSelectionMode,
} from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { SizingExample } from "./SizingExample";
import { exampleModule, initialRegion } from "./exampleTracks";

const sizingModes = ["fixed", "responsive"] as const;
const scales = [1, 0.75, 1.25];

export default function SizingHarness() {
  const [containerWidth, setContainerWidth] = useState(1000);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [useBrowserStore] = useState(() =>
    createBrowserStore({
      assembly: hg38,
      region: initialRegion,
      marginWidth: 50,
      trackWidth: 750,
    }),
  );
  const [useTrackStore] = useState(() =>
    createTrackStore({
      modules: [rulerModule, exampleModule],
      tracks: [
        rulerModule.create({ id: "ruler", title: "Coordinates", config: {} }),
        exampleModule.create({ id: "features", title: "Example features", config: {} }),
      ],
    }),
  );
  const region = useBrowserStore((state) => state.region);
  const selectionMode = useBrowserStore((state) => state.selectionMode);
  const highlights = useBrowserStore((state) => state.highlights);

  return (
    <main>
      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <Box>
          <Typography component="h1" variant="h5">
            Browser sizing and magnification
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All six browsers share region and track stores. Compare text, controls, features, and
            tooltips at each scale. Example data stays local.
          </Typography>
        </Box>
        <Box sx={{ width: 480, maxWidth: "100%" }}>
          <Typography id="container-width-label" variant="body2">
            Container width: up to {containerWidth}px (limited by the page)
          </Typography>
          <Slider
            aria-labelledby="container-width-label"
            min={80}
            max={1400}
            step={10}
            value={containerWidth}
            onChange={(_, value) => setContainerWidth(value as number)}
            valueLabelDisplay="auto"
          />
        </Box>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <TextField
            select
            size="small"
            label="Drag action"
            value={selectionMode}
            onChange={(event) =>
              useBrowserStore
                .getState()
                .setSelectionMode(event.target.value as BrowserSelectionMode)
            }
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="pan">Pan</MenuItem>
            <MenuItem value="zoom">Select to zoom</MenuItem>
            <MenuItem value="highlight">Highlight</MenuItem>
          </TextField>
          <Button onClick={() => useBrowserStore.getState().setRegion(initialRegion)}>
            Reset region
          </Button>
          <Button
            onClick={() =>
              highlights.forEach(({ id }) => useBrowserStore.getState().removeHighlight(id))
            }
          >
            Clear highlights ({highlights.length})
          </Button>
          <Button onClick={() => setHidden(!hidden)}>
            {hidden ? "Show browsers" : "Hide browsers"}
          </Button>
          <Button onClick={() => setMounted(!mounted)}>
            {mounted ? "Unmount browsers" : "Mount browsers"}
          </Button>
        </Stack>
        <Typography variant="body2">
          Shared region: {region.chromosome}:{region.start.toLocaleString()}–
          {region.end.toLocaleString()}. Hide, resize, and show to check recovery; unmount and mount
          to reset the six presets.
        </Typography>
        <Stack spacing={4} sx={{ display: hidden ? "none" : "flex", minWidth: 0 }}>
          {mounted &&
            sizingModes.flatMap((sizing) =>
              scales.map((scale) => (
                <SizingExample
                  key={`${sizing}-${scale}`}
                  initialSizing={sizing}
                  initialScale={scale}
                  containerWidth={containerWidth}
                  browserStore={useBrowserStore}
                  trackStore={useTrackStore}
                />
              )),
            )}
        </Stack>
      </Stack>
    </main>
  );
}
