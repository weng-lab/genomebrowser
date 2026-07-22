import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";

import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import "./muiLicense";

import {
  bigBedModule,
  bigWigModule,
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  methylCModule,
  type BrowserRegion,
  type Highlight,
  type TrackRuntimeContext,
  transcriptModule,
} from "@weng-lab/genomebrowser-v2";
import {
  Cytobands,
  TrackSelect,
  withValueMarkers,
  type TrackSelectCatalogContext,
  type TrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "../src/lib";

// catalogs
import biosamples from "./catalogs/human-biosamples.json";
import psychscreenTracks from "./catalogs/psychscreen.json";

const useBrowserStore = createBrowserStore({
  region: "chr6:20,092,778-23,099,592",
  marginWidth: 55,
  trackWidth: 1445,
});

const cytobandHighlights: readonly Highlight[] = [
  {
    id: "chr6-risk-locus-46m",
    region: { chromosome: "chr6", start: 43_250_000, end: 48_250_000 },
    color: "#ef6c00",
    opacity: 0.6,
  },
  {
    id: "chr6-risk-locus-77m",
    region: { chromosome: "chr6", start: 73_500_000, end: 80_500_000 },
    color: "#f57c00",
    opacity: 0.55,
  },
  {
    id: "chr6-risk-locus-105m",
    region: { chromosome: "chr6", start: 103_000_000, end: 107_000_000 },
    color: "#fb8c00",
    opacity: 0.65,
  },
  {
    id: "chr6-risk-locus-136m",
    region: { chromosome: "chr6", start: 133_000_000, end: 139_000_000 },
    color: "#f9a825",
    opacity: 0.7,
  },
  {
    id: "chr6-narrow-risk-locus-160m",
    region: { start: 159_942_570, end: 159_945_884 },
    color: "#ff9800",
    opacity: 0.8,
  },
];

const locusDescriptions: Readonly<Record<string, string>> = {
  "chr6-risk-locus-46m": "MHC-associated locus",
  "chr6-risk-locus-77m": "Example broad locus",
  "chr6-risk-locus-105m": "Example central locus",
  "chr6-risk-locus-136m": "Example distal locus",
  "chr6-narrow-risk-locus-160m": "Example fine-mapped locus",
};

function loadLocusDescription(highlightId: string) {
  return new Promise<string>((resolve) => {
    window.setTimeout(
      () => resolve(locusDescriptions[highlightId] ?? "No application annotation"),
      450,
    );
  });
}

function LocusTooltip({ highlight }: { highlight: Highlight }) {
  const [description, setDescription] = useState<string>();

  useEffect(() => {
    let active = true;
    void loadLocusDescription(highlight.id).then((value) => {
      if (active) setDescription(value);
    });
    return () => {
      active = false;
    };
  }, [highlight.id]);

  return (
    <text dominantBaseline="hanging">
      {description ? `${highlight.id}: ${description}` : `Loading ${highlight.id}…`}
    </text>
  );
}

const modules = [bigWigModule, bigBedModule, methylCModule, transcriptModule];
const useTrackStore = createTrackStore({
  modules,
  tracks: [
    transcriptModule.create({
      id: "genes",
      title: "GENCODE Genes",
      display: "squish",
      color: "#444444",
      config: {
        assembly: "GRCh38",
        version: 40,
      },
    }),
  ],
});

const assayColors = {
  DNase: "#06da93",
  ATAC: "#02c7b9",
  H3K4me3: "#ff2020",
  ChromHMM: "#0097a7",
  H3K27ac: "#fdc401",
  CTCF: "#01a6f1",
  cCRE: "#000000",
  "RNA-seq": "#00aa00",
  WGBS: "#648bd8",
};

type InteractionPreview = {
  action: string;
  track: string;
  item: string;
  source: string;
  metadata: string;
  color?: string;
};

function getInteractionPreview(
  action: string,
  item: unknown,
  runtime: TrackRuntimeContext,
  catalog: TrackSelectCatalogContext,
): InteractionPreview {
  return {
    action,
    track: `${runtime.base.title} (${runtime.type}, ${runtime.base.id})`,
    item: describeItem(item),
    source: describeConfig(runtime.config),
    metadata: describeMetadata(catalog.metadata),
    color: runtime.base.color,
  };
}

function describeItem(item: unknown) {
  if (!isRecord(item)) return String(item);

  const interestingFields = [
    "name",
    "chr",
    "chrom",
    "start",
    "end",
    "chromStart",
    "chromEnd",
    "x",
    "min",
    "max",
  ];
  const summary = interestingFields.flatMap((field) =>
    field in item ? [`${field}: ${String(item[field])}`] : [],
  );
  return summary.length > 0 ? summary.join(" · ") : `fields: ${Object.keys(item).join(", ")}`;
}

function describeConfig(config: unknown) {
  if (!isRecord(config)) return String(config);
  if (typeof config.url === "string") return config.url;
  return `config keys: ${Object.keys(config).join(", ")}`;
}

function describeMetadata(metadata: TrackSelectCatalogContext["metadata"]) {
  const entries = Object.entries(metadata).slice(0, 4);
  return entries.length > 0
    ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")
    : "No catalog metadata";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function InteractionShowcase() {
  const [open, setOpen] = useState(true);
  const region = useBrowserStore((state) => state.region);
  const setRegion = useBrowserStore((state) => state.setRegion);
  const panelRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLElement>(null);
  const itemRef = useRef<HTMLElement>(null);
  const sourceRef = useRef<HTMLElement>(null);
  const metadataRef = useRef<HTMLElement>(null);

  function showInteractionPreview(preview: InteractionPreview) {
    if (panelRef.current) panelRef.current.style.borderLeftColor = preview.color ?? "";
    if (actionRef.current) actionRef.current.textContent = `${preview.action}: ${preview.track}`;
    if (itemRef.current) itemRef.current.textContent = `Item — ${preview.item}`;
    if (sourceRef.current) sourceRef.current.textContent = `Runtime config — ${preview.source}`;
    if (metadataRef.current) {
      metadataRef.current.textContent = `Catalog metadata — ${preview.metadata}`;
    }
  }

  const sharedInteraction: TrackSelectInteraction<unknown, unknown> = {
    onClick(item, runtime, catalog) {
      showInteractionPreview(getInteractionPreview("Clicked", item, runtime, catalog));
      console.info("[TrackSelect interaction demo] click", {
        item,
        runtime,
        catalog,
      });
    },
    onHover(item, runtime, catalog) {
      showInteractionPreview(getInteractionPreview("Hovering", item, runtime, catalog));
    },
    onLeave(item, runtime, catalog) {
      showInteractionPreview(getInteractionPreview("Left", item, runtime, catalog));
    },
  };
  const resolveTrackInteraction: TrackSelectInteractionResolver = () => sharedInteraction;

  return (
    <>
      <Paper variant="outlined" sx={{ mb: 1, p: 1.5 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">Cytobands integration</Typography>
          <Typography variant="body2">
            The blue bracket follows the complete browser-store region independently. Hover a locus
            to start its local application-data lookup; click it to move the browser and bracket.
          </Typography>
          <Typography variant="caption">
            {`Browser store: ${region.chromosome}:${region.start.toLocaleString()}–${region.end.toLocaleString()}`}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button sx={{ width: 96 }} variant="contained" onClick={() => setOpen(true)}>
              Open
            </Button>
            <Cytobands
              assembly="GRCh38"
              chromosome={region.chromosome}
              currentRegion={region}
              height={28}
              highlights={cytobandHighlights}
              onHighlightClick={(highlight) => {
                const nextRegion: BrowserRegion = {
                  chromosome: highlight.region.chromosome ?? region.chromosome,
                  start: highlight.region.start,
                  end: highlight.region.end,
                };
                setRegion(nextRegion);
              }}
              renderHighlightTooltip={(highlight) => <LocusTooltip highlight={highlight} />}
              width={720}
            />
          </Stack>
        </Stack>
      </Paper>
      <Paper
        ref={panelRef}
        variant="outlined"
        sx={{
          borderLeft: 6,
          borderLeftColor: "divider",
          my: 1,
          p: 1.5,
        }}
      >
        <Stack spacing={0.5}>
          <Typography ref={actionRef} variant="subtitle2" color="text.secondary">
            Hover or click a catalog track feature to inspect its item, runtime context, and catalog
            metadata.
          </Typography>
          <Typography ref={itemRef} variant="body2" />
          <Typography ref={sourceRef} variant="body2" />
          <Typography ref={metadataRef} variant="body2" />
        </Stack>
      </Paper>
      <TrackSelect
        open={open}
        onClose={() => setOpen(false)}
        trackCatalogs={[biosamples, psychscreenTracks]}
        useTrackStore={useTrackStore}
        defaultTrackIds={[
          "human-biosamples::human-biosamples/ccre-aggregate",
          "psychscreen::epigenetic/adult-bcres",
        ]}
        resolveTrackInteraction={resolveTrackInteraction}
        columnOverrides={{
          "human-biosamples": {
            assay: withValueMarkers(assayColors),
          },
        }}
      />
    </>
  );
}

function Main() {
  return (
    <Stack>
      <InteractionShowcase />
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </Stack>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);
