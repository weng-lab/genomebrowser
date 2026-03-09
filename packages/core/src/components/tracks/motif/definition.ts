import { Track, TrackDefinition } from "../types";
import { FetcherContext } from "../../../api/fetchers";
import DenseMotif from "./dense";
import SquishMotif from "./squish";
import type { MotifRect, MotifTrackData } from "./types";

export type MotifTrack = Track & {
  displayMode: "dense" | "squish";
  consensusRegex: string;
  peaksAccession: string;
  assembly: string;
  peakColor?: string;
};

async function fetchMotif(ctx: FetcherContext) {
  const track = ctx.track as MotifTrack;
  const { expandedDomain, queries } = ctx;

  const result = await queries.fetchMotif({
    variables: {
      range: {
        chromosome: expandedDomain.chromosome,
        start: expandedDomain.start,
        end: expandedDomain.end,
      },
      prange: {
        chrom: expandedDomain.chromosome,
        chrom_start: expandedDomain.start,
        chrom_end: expandedDomain.end,
      },
      assembly: track.assembly,
      consensus_regex: track.consensusRegex,
      peaks_accession: track.peaksAccession,
    },
  });

  const motifData = result.data;
  const data: MotifTrackData = {
    occurrenceRect:
      motifData?.meme_occurrences?.map(
        (occurrence: any) =>
          ({
            start: occurrence.genomic_region.start,
            end: occurrence.genomic_region.end,
            pwm: occurrence.motif.pwm,
          }) as MotifRect
      ) ?? [],
    peaks:
      motifData?.peaks?.peaks?.map(
        (peak: any) =>
          ({
            start: peak.chrom_start,
            end: peak.chrom_end,
          }) as MotifRect
      ) ?? [],
  };

  return {
    data,
    error: result.error?.message ?? null,
  };
}

export const MotifDefinition: TrackDefinition<"dense" | "squish"> = {
  type: "motif",
  defaultDisplayMode: "squish",
  defaultHeight: 100,
  renderers: {
    dense: DenseMotif,
    squish: SquishMotif,
  },
  fetcher: fetchMotif,
};

export function createMotifTrack(opts: {
  id: string;
  title: string;
  consensusRegex: string;
  peaksAccession: string;
  assembly: string;
  height?: number;
  displayMode?: "dense" | "squish";
  color?: string;
  peakColor?: string;
  titleSize?: number;
  onClick?: (item: any) => void;
  onHover?: (item: any) => void;
  onLeave?: (item: any) => void;
  tooltip?: React.FC<any>;
}): MotifTrack {
  return {
    type: MotifDefinition.type,
    displayMode: opts.displayMode ?? MotifDefinition.defaultDisplayMode,
    height: opts.height ?? MotifDefinition.defaultHeight,
    id: opts.id,
    title: opts.title,
    consensusRegex: opts.consensusRegex,
    peaksAccession: opts.peaksAccession,
    assembly: opts.assembly,
    color: opts.color,
    peakColor: opts.peakColor,
    titleSize: opts.titleSize,
    onClick: opts.onClick,
    onHover: opts.onHover,
    onLeave: opts.onLeave,
    tooltip: opts.tooltip,
  };
}
