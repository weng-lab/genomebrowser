import { createRoot } from "react-dom/client";
import { useRef, useState } from "react";

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
  type TrackRuntimeContext,
  transcriptModule,
} from "@weng-lab/genomebrowser-v2";
import {
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
  region: "chr6:21,592,778-21,599,592",
  marginWidth: 55,
  trackWidth: 1445,
});

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
      <Button variant="contained" onClick={() => setOpen(true)}>
        Open
      </Button>
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
