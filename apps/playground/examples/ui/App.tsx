"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {
  createBrowserStore,
  createSettingsStore,
  createTrackStore,
  GenomeBrowser,
  hg38,
  parseRegion,
  type GenomicRegion,
  type Highlight,
  type TrackRuntimeContext,
} from "@weng-lab/genomebrowser";
import { bigBedModule as bigBedUiModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bigWigModule as bigWigUiModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { bulkBedModule as bulkBedUiModule } from "@weng-lab/genomebrowser-tracks/bulkbed";
import { caveModule as caveUiModule } from "@weng-lab/genomebrowser-tracks/cave";
import { methylCModule as methylCUiModule } from "@weng-lab/genomebrowser-tracks/methylc";
import { TrackBaseSettings } from "@weng-lab/genomebrowser-tracks/shared";
import { transcriptModule as transcriptUiModule } from "@weng-lab/genomebrowser-tracks/transcript";
import {
  BrowserNavigationButton,
  Cytobands,
  TrackSelect,
  withValueMarkers,
  type TrackSelectCollectionContext,
  type TrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "@weng-lab/genomebrowser-ui";

// collections
import biosamples from "./collections/human-biosamples.json";
import psychscreenTracks from "./collections/psychscreen.json";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: parseRegion("chr6:21,592,778-21,599,592"),
  marginWidth: 55,
  trackWidth: 1445,
});

const useSettingsStore = createSettingsStore({
  baseSettingsComponent: TrackBaseSettings,
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

const modules = [
  bigWigUiModule,
  bigBedUiModule,
  bulkBedUiModule,
  caveUiModule,
  methylCUiModule,
  transcriptUiModule,
];
const useTrackStore = createTrackStore({
  modules,
  tracks: [
    bigWigUiModule.create({
      id: "bigwig-settings-example",
      title: "BigWig settings: DNase aggregate",
      color: "#1B2021",
      config: {
        url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
      },
    }),
    bigBedUiModule.create({
      id: "bigbed-settings-example",
      title: "BigBed settings: ENCODE cCREs",
      color: "#4b9560",
      display: "dense",
      config: {
        url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
      },
    }),
    bulkBedUiModule.create({
      id: "bulkbed-settings-example",
      title: "BulkBed settings: ENCODE datasets",
      color: "#4b9560",
      config: {
        gap: 4,
        datasets: [
          {
            name: "ENCODE cCREs",
            url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
          },
        ],
      },
    }),
    transcriptUiModule.create({
      id: "transcript-settings-example",
      title: "Transcript settings: GENCODE genes",
      display: "squish",
      color: "#444444",
      config: {
        assembly: "GRCh38",
        version: 40,
      },
    }),
    caveUiModule.create({
      id: "cave-settings-example",
      title: "CAVE settings: adult GABA",
      config: {
        neurotransmitter: "GABA",
        age: "Adulthood",
      },
    }),
    methylCUiModule.create({
      id: "methylc-settings-example",
      title: "MethylC settings: EB100001",
      config: {
        range: { min: 0, max: 1 },
        urls: {
          plusStrand: {
            cpg: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_cpg_pos.bw" },
            chg: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chg_pos.bw" },
            chh: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chh_pos.bw" },
            depth: {
              url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_coverage_pos.bw",
            },
          },
          minusStrand: {
            cpg: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_cpg_neg.bw" },
            chg: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chg_neg.bw" },
            chh: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chh_neg.bw" },
            depth: {
              url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_coverage_neg.bw",
            },
          },
        },
      },
    }),
  ],
});

const settingsExamples = [
  { id: "bigwig-settings-example", label: "Open BigWig settings" },
  { id: "bigbed-settings-example", label: "Open BigBed settings" },
  { id: "bulkbed-settings-example", label: "Open BulkBed settings" },
  { id: "transcript-settings-example", label: "Open transcript settings" },
  { id: "cave-settings-example", label: "Open CAVE settings" },
  { id: "methylc-settings-example", label: "Open MethylC settings" },
] as const;

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
  collection: TrackSelectCollectionContext,
): InteractionPreview {
  return {
    action,
    track: `${runtime.base.title} (${runtime.type}, ${runtime.base.id})`,
    item: describeItem(item),
    source: describeConfig(runtime.config),
    metadata: describeMetadata(collection.metadata),
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

function describeMetadata(metadata: TrackSelectCollectionContext["metadata"]) {
  const entries = Object.entries(metadata).slice(0, 4);
  return entries.length > 0
    ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")
    : "No collection metadata";
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
      metadataRef.current.textContent = `Collection metadata — ${preview.metadata}`;
    }
  }

  const sharedInteraction: TrackSelectInteraction<unknown, unknown> = {
    onClick(item, runtime, collection) {
      showInteractionPreview(getInteractionPreview("Clicked", item, runtime, collection));
      console.info("[TrackSelect interaction demo] click", {
        item,
        runtime,
        collection,
      });
    },
    onHover(item, runtime, collection) {
      showInteractionPreview(getInteractionPreview("Hovering", item, runtime, collection));
    },
    onLeave(item, runtime, collection) {
      showInteractionPreview(getInteractionPreview("Left", item, runtime, collection));
    },
  };
  const resolveTrackInteraction: TrackSelectInteractionResolver = () => sharedInteraction;

  return (
    <>
      <Paper variant="outlined" sx={{ mb: 1, p: 1.5 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">Browser navigation and cytobands</Typography>
          <Typography variant="body2">
            Pan or zoom the browser with the navigation controls. The blue bracket follows the
            complete browser-store region independently. Hover a locus to start its local
            application-data lookup; click it to move the browser and bracket.
          </Typography>
          <Typography variant="caption">
            {`Browser store: ${region.chromosome}:${region.start.toLocaleString()}–${region.end.toLocaleString()}`}
          </Typography>
          <BrowserNavigationCompositions />
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
                const nextRegion: GenomicRegion = {
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
            Hover or click a collection track feature to inspect its item, runtime context, and
            collection metadata.
          </Typography>
          <Typography ref={itemRef} variant="body2" />
          <Typography ref={sourceRef} variant="body2" />
          <Typography ref={metadataRef} variant="body2" />
        </Stack>
      </Paper>
      <TrackSelect
        open={open}
        onClose={() => setOpen(false)}
        trackCollections={[biosamples, psychscreenTracks]}
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

function BrowserNavigationCompositions() {
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography component="div" sx={{ mb: 0.5 }} variant="caption">
          Wide composition
        </Typography>
        <Stack
          aria-label="Wide browser navigation"
          direction="row"
          flexWrap="wrap"
          gap={0.75}
          role="toolbar"
          useFlexGap
        >
          <BrowserNavigationButton
            action={{ type: "pan", fraction: -1 }}
            aria-label="Pan left by one viewport"
            browserStore={useBrowserStore}
            size="small"
            variant="outlined"
          >
            ← Full viewport
          </BrowserNavigationButton>
          <BrowserNavigationButton
            action={{ type: "pan", fraction: -0.5 }}
            aria-label="Pan left by half a viewport"
            browserStore={useBrowserStore}
            size="small"
            variant="outlined"
          >
            ← Half viewport
          </BrowserNavigationButton>
          <BrowserNavigationButton
            action={{ type: "pan", fraction: 0.5 }}
            aria-label="Pan right by half a viewport"
            browserStore={useBrowserStore}
            size="small"
            variant="outlined"
          >
            Half viewport →
          </BrowserNavigationButton>
          <BrowserNavigationButton
            action={{ type: "pan", fraction: 1 }}
            aria-label="Pan right by one viewport"
            browserStore={useBrowserStore}
            size="small"
            variant="outlined"
          >
            Full viewport →
          </BrowserNavigationButton>
          <BrowserNavigationButton
            action={{ type: "zoom", factor: 3 }}
            aria-label="Zoom out 3×"
            browserStore={useBrowserStore}
            size="small"
            variant="outlined"
          >
            − 3×
          </BrowserNavigationButton>
          <BrowserNavigationButton
            action={{ type: "zoom", factor: 1 / 3 }}
            aria-label="Zoom in 3×"
            browserStore={useBrowserStore}
            size="small"
            variant="outlined"
          >
            + 3×
          </BrowserNavigationButton>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: "100%", width: 220 }}>
        <Typography component="div" sx={{ mb: 0.5 }} variant="caption">
          Narrow composition (220 px)
        </Typography>
        <Stack
          aria-label="Narrow browser navigation"
          direction="row"
          flexWrap="wrap"
          gap={0.75}
          role="toolbar"
          useFlexGap
        >
          <Tooltip title="Pan left by a quarter viewport">
            <Box component="span" sx={{ display: "inline-flex" }}>
              <BrowserNavigationButton
                action={{ type: "pan", fraction: -0.25 }}
                aria-label="Pan left by a quarter viewport"
                browserStore={useBrowserStore}
                size="small"
                sx={{ minWidth: 44 }}
                variant="contained"
              >
                <span aria-hidden="true">←</span>
              </BrowserNavigationButton>
            </Box>
          </Tooltip>
          <Tooltip title="Pan right by a quarter viewport">
            <Box component="span" sx={{ display: "inline-flex" }}>
              <BrowserNavigationButton
                action={{ type: "pan", fraction: 0.25 }}
                aria-label="Pan right by a quarter viewport"
                browserStore={useBrowserStore}
                size="small"
                sx={{ minWidth: 44 }}
                variant="contained"
              >
                <span aria-hidden="true">→</span>
              </BrowserNavigationButton>
            </Box>
          </Tooltip>
          <Tooltip title="Zoom out 2×">
            <Box component="span" sx={{ display: "inline-flex" }}>
              <BrowserNavigationButton
                action={{ type: "zoom", factor: 2 }}
                aria-label="Zoom out 2×"
                browserStore={useBrowserStore}
                size="small"
                sx={{ minWidth: 44 }}
                variant="outlined"
              >
                <span aria-hidden="true">−</span>
              </BrowserNavigationButton>
            </Box>
          </Tooltip>
          <Tooltip title="Zoom in 2×">
            <Box component="span" sx={{ display: "inline-flex" }}>
              <BrowserNavigationButton
                action={{ type: "zoom", factor: 0.5 }}
                aria-label="Zoom in 2×"
                browserStore={useBrowserStore}
                size="small"
                sx={{ minWidth: 44 }}
                variant="outlined"
              >
                <span aria-hidden="true">+</span>
              </BrowserNavigationButton>
            </Box>
          </Tooltip>
        </Stack>
      </Box>
    </Stack>
  );
}

function TrackSettingsExamples() {
  const openSettings = useSettingsStore((state) => state.openSettings);

  return (
    <Paper variant="outlined" sx={{ mb: 1, p: 1.5 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle1">Track UI examples</Typography>
        <Typography variant="body2">
          Open a prepared track to review its MUI settings dialog. Hover data in any matching
          browser track to review its tooltip.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
          {settingsExamples.map((example) => (
            <Button
              key={example.id}
              size="small"
              variant="outlined"
              onClick={() => openSettings(example.id, { x: 0, y: 0 })}
            >
              {example.label}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function App() {
  return (
    <Stack>
      <TrackSettingsExamples />
      <InteractionShowcase />
      <GenomeBrowser
        browserStore={useBrowserStore}
        settingsStore={useSettingsStore}
        trackStore={useTrackStore}
      />
    </Stack>
  );
}
