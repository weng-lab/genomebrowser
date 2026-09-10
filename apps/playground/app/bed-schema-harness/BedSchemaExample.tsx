"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import { type BigBedRow } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bedSchemaKeys, bedSchemaKeySchema } from "@weng-lab/genomebrowser-tracks/shared";
import { BrowserNavigationButton } from "@weng-lab/genomebrowser-ui";

type BedSchemaExampleProps = {
  title: string;
  description: string;
  schemaHint: string;
  useBrowserStore: ReturnType<typeof createBrowserStore>;
  useTrackStore: ReturnType<typeof createTrackStore>;
  selected: BigBedRow | null;
  clearSelection: () => void;
};

const initialRegion = { chromosome: "chr1", start: 10_000_000, end: 10_100_000 };

export function BedSchemaExample({
  title,
  description,
  schemaHint,
  useBrowserStore,
  useTrackStore,
  selected,
  clearSelection,
}: BedSchemaExampleProps) {
  const [error, setError] = useState<string | null>(null);
  const region = useBrowserStore((state) => state.region);
  const tracks = useTrackStore((state) => state.tracks);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const { marginWidth, setTrackWidth } = useBrowserStore.getState();
      setTrackWidth(Math.max(1, entry.contentRect.width - marginWidth));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [useBrowserStore]);

  return (
    <main>
      <Stack spacing={2}>
        <Typography component="h1" variant="h5">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <BrowserNavigationButton
            browserStore={useBrowserStore}
            action={{ type: "zoom", factor: 0.5 }}
            size="small"
          >
            Zoom in
          </BrowserNavigationButton>
          <BrowserNavigationButton
            browserStore={useBrowserStore}
            action={{ type: "zoom", factor: 2 }}
            size="small"
          >
            Zoom out
          </BrowserNavigationButton>
          <Button size="small" onClick={() => useBrowserStore.getState().setRegion(initialRegion)}>
            Reset region
          </Button>
          <Typography variant="body2">
            {region.chromosome}:{region.start.toLocaleString("en-US")}–
            {region.end.toLocaleString("en-US")}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
          {tracks.map((track) => (
            <TextField
              key={track.base.id}
              select
              size="small"
              label={`${track.base.title} schema`}
              value={track.config.bedSchema ?? "bed3"}
              sx={{ minWidth: 210 }}
              onChange={(event) => {
                const result = useTrackStore.getState().updateTrack(track.base.id, {
                  config: { bedSchema: bedSchemaKeySchema.parse(event.target.value) },
                });
                setError(result.ok ? null : result.error);
                clearSelection();
              }}
            >
              {bedSchemaKeys.map((key) => (
                <MenuItem key={key} value={key}>
                  {key}
                </MenuItem>
              ))}
            </TextField>
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {schemaHint}
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Box ref={containerRef} sx={{ width: "100%", minWidth: 0 }}>
          <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
        </Box>
        <Typography component="h2" variant="subtitle1">
          Selected interval
        </Typography>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1,
            bgcolor: "action.hover",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontSize: 12,
          }}
        >
          {selected
            ? JSON.stringify(selected, null, 2)
            : "Click a colored rectangle to inspect its name, color, and fields."}
        </Box>
      </Stack>
    </main>
  );
}
