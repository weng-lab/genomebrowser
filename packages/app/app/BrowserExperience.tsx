"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import {
  GenomeBrowser,
  bigBedModule,
  bigWigModule,
  createBrowserStore,
  createTrackStore,
  hg38,
  transcriptModule,
} from "@weng-lab/genomebrowser";
import { TrackSelect, type TrackSelectCatalog } from "@weng-lab/genomebrowser-ui";

const marginWidth = 50;

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
  marginWidth,
  trackWidth: 1350,
});

const useTrackStore = createTrackStore({
  modules: [transcriptModule, bigWigModule, bigBedModule],
  tracks: [],
});

const trackCatalog = {
  id: "comparison-tracks",
  label: "Comparison tracks",
  views: [
    {
      id: "all-tracks",
      label: "All tracks",
      columns: [
        { field: "type", label: "Type" },
        { field: "category", label: "Category" },
      ],
      grouping: ["category"],
      leaf: "title",
    },
  ],
  tracks: [
    {
      type: "transcript",
      id: "genes",
      title: "GENCODE genes",
      display: "squish",
      height: 60,
      color: "#444444",
      config: {
        endpoint: "/api/screen-graphql",
        assembly: "GRCh38",
        version: 40,
      },
      metadata: { category: "Reference" },
    },
    {
      type: "bigwig",
      id: "dnase",
      title: "DNase aggregate",
      display: "full",
      height: 60,
      color: "#06da93",
      config: {
        url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
      },
      metadata: { category: "Signal" },
    },
    {
      type: "bigbed",
      id: "ccres",
      title: "ENCODE cCREs",
      display: "dense",
      height: 30,
      color: "#000000",
      config: {
        url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
      },
      metadata: { category: "Annotation" },
    },
    {
      type: "bigbed",
      id: "astro-peaks",
      title: "Astrocyte peaks",
      display: "squish",
      height: 40,
      color: "#4b9560",
      config: {
        url: "https://downloads.wenglab.org/Astro.PeakCalls.bb",
      },
      metadata: { category: "Annotation" },
    },
  ],
} satisfies TrackSelectCatalog;

const defaultTrackIds = [
  "comparison-tracks::genes",
  "comparison-tracks::dnase",
  "comparison-tracks::ccres",
  "comparison-tracks::astro-peaks",
];

export function BrowserExperience() {
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const setTrackWidth = (width: number) => {
      const computed = Math.max(1, width - marginWidth);
      useBrowserStore.getState().setTrackWidth(computed);
      console.log(computed);
    };

    setTrackWidth(container.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      setTrackWidth(entry.contentRect.width);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Button
        variant="contained"
        sx={{ alignSelf: "flex-start" }}
        onClick={() => setTrackSelectOpen(true)}
      >
        Select tracks
      </Button>
      <div ref={containerRef} style={{ width: "100%", overflowX: "auto" }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      </div>
      <TrackSelect
        open={trackSelectOpen}
        onClose={() => setTrackSelectOpen(false)}
        title="Choose tracks"
        trackCatalogs={[trackCatalog]}
        useTrackStore={useTrackStore}
        defaultTrackIds={defaultTrackIds}
      />
    </main>
  );
}
