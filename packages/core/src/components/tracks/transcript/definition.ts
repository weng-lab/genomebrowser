import { TrackDefinition, TrackInstance } from "../types";
import { FetcherContext } from "../../../api/fetchers";
import PackTranscript from "./pack";
import SquishTranscript from "./squish";
import TranscriptSettings from "./settings";

export type TranscriptTrack = TrackInstance & {
  displayMode: "pack" | "squish";
  assembly: string;
  version: number;
  geneName?: string;
  canonicalColor?: string;
  highlightColor?: string;
};

async function fetchTranscript(ctx: FetcherContext) {
  const track = ctx.track as TranscriptTrack;
  const { expandedDomain, queries } = ctx;
  const result = await queries.fetchGene({
    variables: {
      assembly: track.assembly,
      chromosome: expandedDomain.chromosome,
      start: expandedDomain.start,
      end: expandedDomain.end,
      version: track.version,
    },
  });

  return {
    data: result.data?.gene ?? [],
    error: result.error?.message ?? null,
  };
}

export const TranscriptDefinition: TrackDefinition<"pack" | "squish"> = {
  type: "transcript",
  defaultDisplayMode: "squish",
  defaultHeight: 100,
  renderers: {
    pack: PackTranscript,
    squish: SquishTranscript,
  },
  fetcher: fetchTranscript,
  settingsPanel: TranscriptSettings,
};

export function createTranscriptTrack(opts: {
  id: string;
  title: string;
  assembly: string;
  version: number;
  height?: number;
  displayMode?: "pack" | "squish";
  color?: string;
  titleSize?: number;
  geneName?: string;
  canonicalColor?: string;
  highlightColor?: string;
  onClick?: (item: any) => void;
  onHover?: (item: any) => void;
  onLeave?: (item: any) => void;
  tooltip?: React.FC<any>;
}): TranscriptTrack {
  return {
    type: TranscriptDefinition.type,
    displayMode: opts.displayMode ?? TranscriptDefinition.defaultDisplayMode,
    height: opts.height ?? TranscriptDefinition.defaultHeight,
    id: opts.id,
    title: opts.title,
    assembly: opts.assembly,
    version: opts.version,
    color: opts.color,
    titleSize: opts.titleSize,
    geneName: opts.geneName,
    canonicalColor: opts.canonicalColor,
    highlightColor: opts.highlightColor,
    onClick: opts.onClick,
    onHover: opts.onHover,
    onLeave: opts.onLeave,
    tooltip: opts.tooltip,
  };
}
