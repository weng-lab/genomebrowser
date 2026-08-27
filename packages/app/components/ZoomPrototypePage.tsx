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
  type GenomicRegion,
} from "@weng-lab/genomebrowser";
import { geneModule } from "@weng-lab/genomebrowser-tracks/gene";

import { SpanZoomStepper } from "./zoom-prototypes/SpanZoomStepper";
import {
  SpanZoomContextDetail,
  SpanZoomScaleBar,
  SpanZoomToolbar,
} from "./zoom-prototypes/SpanZoomVariants";
import { SplitZoomButtons } from "./zoom-prototypes/SplitZoomButtons";
import {
  SplitZoomCoordinateStack,
  SplitZoomMagnitudeRail,
  SplitZoomUnifiedMenu,
} from "./zoom-prototypes/SplitZoomVariants";

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
  modules: [geneModule],
  tracks: [
    geneModule.create({
      id: "zoom-prototype-genes",
      title: "GENCODE genes",
      color: "#355f75",
      display: "merged",
      config: {
        url: "https://users.wenglab.org/mezaj/gencode.v40.comprehensive.bigGenePredPlusV1.bb",
      },
    }),
  ],
});

const prototypeGroups = [
  {
    title: "B. Span and stepper concepts",
    description: "Keep the current genomic scale visible while making zoom direction immediate.",
    prototypes: [
      {
        title: "B1. Original span stepper — reference",
        description: "Magnifier controls surround a centered span and coordinate readout.",
        control: <SpanZoomStepper useBrowserStore={useBrowserStore} />,
      },
      {
        title: "B2. Genomic scale bar",
        description: "Places the current span on a chromosome-to-base logarithmic scale.",
        control: <SpanZoomScaleBar useBrowserStore={useBrowserStore} />,
      },
      {
        title: "B3. Coordinate toolbar",
        description: "Centers coordinates while separating controls and span into stable zones.",
        control: <SpanZoomToolbar useBrowserStore={useBrowserStore} />,
      },
      {
        title: "B4. Context and detail",
        description: "Uses analytical intent as the action and previews the resulting span.",
        control: <SpanZoomContextDetail useBrowserStore={useBrowserStore} />,
      },
    ],
  },
  {
    title: "C. Magnitude and menu concepts",
    description:
      "Preserve deliberate zoom amounts without returning to ambiguous plus/minus labels.",
    prototypes: [
      {
        title: "C1. Original split buttons — reference",
        description: "A gentle 1.5× action stays visible while stronger jumps live in menus.",
        control: <SplitZoomButtons useBrowserStore={useBrowserStore} />,
      },
      {
        title: "C2. Coordinate stack",
        description: "Centers coordinates, aligns actions below, and moves span to its own edge.",
        control: <SplitZoomCoordinateStack useBrowserStore={useBrowserStore} />,
      },
      {
        title: "C3. Magnitude rail",
        description: "Makes every amount directly scannable against context and detail actions.",
        control: <SplitZoomMagnitudeRail useBrowserStore={useBrowserStore} />,
      },
      {
        title: "C4. Unified step menu",
        description: "Selects one shared magnitude between immediate zoom-out and zoom-in actions.",
        control: <SplitZoomUnifiedMenu useBrowserStore={useBrowserStore} />,
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
            Eight variations operate the same browser. Compare readability, confidence, and speed
            across gene, base, and chromosome scales.
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
              <Typography sx={{ fontVariantNumeric: "tabular-nums" }} variant="body1">
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
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  lg: "repeat(2, minmax(0, 1fr))",
                },
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
