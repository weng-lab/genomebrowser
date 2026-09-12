"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { createBrowserStore, createTrackStore, GenomeBrowser, mm10 } from "@weng-lab/genomebrowser";
import {
  geneModule,
  getGeneDatasetsForAssembly,
  getGeneDatasetTitle,
} from "@weng-lab/genomebrowser-tracks/gene";
import { BrowserNavigationButton } from "@weng-lab/genomebrowser-ui";
import { useEffect, useRef } from "react";

const dataset = getGeneDatasetsForAssembly(mm10.id).find(
  (candidate) => candidate.variant === "comprehensive",
);
if (!dataset) throw new Error("The mm10 Gene dataset is missing from the catalog.");

const useBrowserStore = createBrowserStore({
  assembly: mm10,
  region: { chromosome: "chr1", start: 3_000_000, end: 4_000_000 },
  marginWidth: 180,
  trackWidth: 1000,
});
const useTrackStore = createTrackStore({
  modules: [geneModule],
  tracks: [
    geneModule.create({
      id: dataset.id,
      title: getGeneDatasetTitle(dataset),
      source: "host",
      display: "full",
      config: { url: dataset.url },
    }),
  ],
});

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const region = useBrowserStore((state) => state.region);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const { marginWidth, setTrackWidth } = useBrowserStore.getState();
      setTrackWidth(Math.max(1, entry.contentRect.width - marginWidth));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap", alignItems: "center", mb: 2 }}
      >
        <Typography component="h1" variant="h6" sx={{ m: 0 }}>
          Mouse genes · mm10
        </Typography>
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
        <Typography variant="body2" color="text.secondary">
          {region.chromosome}:{region.start.toLocaleString("en-US")}–
          {region.end.toLocaleString("en-US")}
        </Typography>
      </Stack>
      <Box ref={containerRef} sx={{ width: "100%", overflowX: "auto" }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      </Box>
    </main>
  );
}
