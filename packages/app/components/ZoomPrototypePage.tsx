"use client";

// THROWAWAY_UI: deployed comparison page for disposable zoom-control prototypes.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  hg38,
  transcriptModule,
  type GenomicRegion,
} from "@weng-lab/genomebrowser";

import { InlineEditableZoomToolbar } from "./zoom-prototypes/InlineEditableZoomToolbar";

const initialRegion: GenomicRegion = {
  chromosome: "chr6",
  start: 21_592_778,
  end: 21_599_592,
};

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: initialRegion,
  marginWidth: 90,
  trackWidth: 1100,
});

const useTrackStore = createTrackStore({
  modules: [transcriptModule],
  tracks: [
    transcriptModule.create({
      id: "zoom-prototype-transcripts",
      title: "GENCODE genes",
      color: "#355f75",
      display: "squish",
      config: { assembly: "GRCh38", version: 40 },
    }),
  ],
});

const prototypeGroups = [
  {
    title: "E. Inline navigation concept",
    description:
      "Keep routine zooming immediate while making each part of the current region directly editable.",
    prototypes: [
      {
        title: "E1. Editable region toolbar",
        description:
          "Pan and zoom flank the editable region, each with a rarely changed default magnitude.",
        control: <InlineEditableZoomToolbar useBrowserStore={useBrowserStore} />,
      },
    ],
  },
] as const;

export function ZoomPrototypePage() {
  const region = useBrowserStore((state) => state.region);
  const setRegion = useBrowserStore((state) => state.setRegion);
  const chromosomeLength = useBrowserStore(
    (state) => state.assembly.chromosomes[state.region.chromosome],
  );

  return (
    <Box component="main" sx={{ mx: "auto", maxWidth: 1320, px: { xs: 2, md: 3 }, py: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography component="h1" variant="h4">
            Genome browser zoom concepts
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body1">
            One deliberately simple toolbar operates the browser across gene, base, and chromosome
            scales.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack
            alignItems={{ xs: "stretch", md: "center" }}
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Box>
              <Typography color="text.secondary" variant="caption">
                Current viewport
              </Typography>
              <Typography
                aria-live="polite"
                sx={{ fontVariantNumeric: "tabular-nums" }}
                variant="body1"
              >
                {formatRegion(region)}
              </Typography>
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
              <Button size="small" variant="outlined" onClick={() => setRegion(initialRegion)}>
                Gene scale
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  setRegion({ chromosome: region.chromosome, start: 21_596_000, end: 21_596_001 })
                }
              >
                One base
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  setRegion({ chromosome: region.chromosome, start: 0, end: chromosomeLength })
                }
              >
                Whole chromosome
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {prototypeGroups.map((group) => (
          <Stack key={group.title} spacing={1.25}>
            <Box>
              <Typography component="h2" variant="h6">
                {group.title}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {group.description}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: "minmax(0, 1fr)",
              }}
            >
              {group.prototypes.map((prototype) => (
                <Paper key={prototype.title} variant="outlined" sx={{ minWidth: 0, p: 2 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography component="h3" variant="subtitle1">
                        {prototype.title}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {prototype.description}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        alignItems: "center",
                        display: "flex",
                        minHeight: 132,
                        overflowX: "auto",
                        py: 0.5,
                        width: "100%",
                      }}
                    >
                      {prototype.control}
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Stack>
        ))}

        <Paper variant="outlined" sx={{ overflowX: "auto", p: 1.5 }}>
          <Typography component="h2" sx={{ mb: 1 }} variant="subtitle1">
            Shared browser preview
          </Typography>
          <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
        </Paper>
      </Stack>
    </Box>
  );
}

function formatRegion(region: GenomicRegion) {
  const span = region.end - region.start;
  return `${region.chromosome}:${region.start.toLocaleString()}–${region.end.toLocaleString()} · ${span.toLocaleString()} bp`;
}
