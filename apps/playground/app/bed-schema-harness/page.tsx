"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { createBrowserStore, createTrackStore, GenomeBrowser, mm10 } from "@weng-lab/genomebrowser";
import { bigBedModule, type BigBedRow } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";
import { bedSchemaKeys, bedSchemaKeySchema } from "@weng-lab/genomebrowser-tracks/shared";
import { BrowserNavigationButton } from "@weng-lab/genomebrowser-ui";

const initialRegion = { chromosome: "chr1", start: 10_000_000, end: 10_100_000 };
const chromHmmSources = [
  { name: "Forebrain E11.5", url: "https://downloads.wenglab.org/Registry-V4/ENCFF330GHF.bigBed" },
  { name: "Forebrain E12.5", url: "https://downloads.wenglab.org/Registry-V4/ENCFF739VQW.bigBed" },
];
const ccreSources = [
  { name: "Aggregate", url: "https://downloads.wenglab.org/mm10-cCREs.DCC.bigBed" },
  {
    name: "Brown adipose tissue",
    url: "https://downloads.wenglab.org/Registry-V4/ENCFF409WOB_ENCFF476CKA.bigBed",
  },
];

export default function BedSchemaHarness() {
  const [selected, setSelected] = useState<BigBedRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useBrowserStore] = useState(() =>
    createBrowserStore({
      assembly: mm10,
      region: initialRegion,
      marginWidth: 210,
      trackWidth: 1000,
    }),
  );
  const [useTrackStore] = useState(() =>
    createTrackStore({
      modules: [bigBedModule, bulkBedModule],
      tracks: [
        bigBedModule.create(
          {
            id: "chromhmm",
            title: "ChromHMM · single",
            config: {
              url: chromHmmSources[0].url,
              bedSchema: "bed9",
              rowHeight: 28,
            },
          },
          { onClick: setSelected },
        ),
        bulkBedModule.create(
          {
            id: "bulk-chromhmm",
            title: "ChromHMM · bulk",
            config: {
              datasets: chromHmmSources,
              bedSchema: "bed9",
              rowHeight: 28,
              gap: 4,
            },
          },
          { onClick: setSelected },
        ),
        bigBedModule.create(
          {
            id: "ccres",
            title: "cCREs · single",
            config: {
              url: ccreSources[0].url,
              bedSchema: "ccre",
              rowHeight: 28,
            },
          },
          { onClick: setSelected },
        ),
        bulkBedModule.create(
          {
            id: "bulk-ccres",
            title: "cCREs · bulk",
            config: {
              datasets: ccreSources,
              bedSchema: "ccre",
              rowHeight: 28,
              gap: 4,
            },
          },
          { onClick: setSelected },
        ),
      ],
    }),
  );
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
          Mouse ChromHMM and cCRE colors
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real SCREEN sources · mm10. Bulk ChromHMM rows: forebrain E11.5 and E12.5. Bulk cCRE rows:
          aggregate and brown adipose tissue. Hover for labels; click an interval to inspect it.
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
                setSelected(null);
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
          Choose bed3 to compare the track-color fallback, then restore bed9 for ChromHMM or ccre
          for cCREs. Selecting ccre on a ChromHMM source exercises the missing-column error; restore
          bed9 to recover.
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
