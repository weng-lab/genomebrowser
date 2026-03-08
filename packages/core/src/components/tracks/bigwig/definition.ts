import { Track, TrackDefinition } from "../types";
import { FetcherContext } from "../../../api/fetchers";
import { getBigDataRace } from "../../../api/fetchers";
import { applyFillWithZero } from "../../../api/getBigWigData";
import { registerTrack } from "../registry";
import ReworkBigWig from "./rework";
import DenseBigWig from "./dense";
import BigWigSettings from "./settings";
import type { YRange } from "./types";

// --- Concrete track type ---

export type BigWigTrack = Track & {
  displayMode: "full" | "dense";
  url: string;
  range?: YRange;
  customRange?: YRange;
  fillWithZero?: boolean;
};

// --- Fetcher ---

async function fetchBigWig(ctx: FetcherContext) {
  const track = ctx.track as BigWigTrack;
  const { expandedDomain, preRenderedWidth, queries } = ctx;
  const result = await getBigDataRace(track.url, expandedDomain, preRenderedWidth, queries);
  if (track.fillWithZero) applyFillWithZero(result.data);
  return result;
}

// --- Definition ---

export const BigWigDefinition: TrackDefinition<"full" | "dense"> = {
  type: "bigwig",
  defaultDisplayMode: "full",
  defaultHeight: 100,
  renderers: {
    full: ReworkBigWig,
    dense: DenseBigWig,
  },
  fetcher: fetchBigWig,
  settingsPanel: BigWigSettings,
};

registerTrack(BigWigDefinition);

// --- Factory ---

export function createBigWigTrack(opts: {
  id: string;
  title: string;
  url: string;
  height?: number;
  displayMode?: "full" | "dense";
  color?: string;
  titleSize?: number;
  shortLabel?: string;
  range?: YRange;
  customRange?: YRange;
  fillWithZero?: boolean;
  onClick?: (item: any) => void;
  onHover?: (item: any) => void;
  onLeave?: (item: any) => void;
  tooltip?: React.FC<any>;
}): BigWigTrack {
  return {
    definition: BigWigDefinition,
    displayMode: opts.displayMode ?? BigWigDefinition.defaultDisplayMode,
    height: opts.height ?? BigWigDefinition.defaultHeight,
    id: opts.id,
    title: opts.title,
    url: opts.url,
    color: opts.color,
    titleSize: opts.titleSize,
    shortLabel: opts.shortLabel,
    range: opts.range,
    customRange: opts.customRange,
    fillWithZero: opts.fillWithZero,
    onClick: opts.onClick,
    onHover: opts.onHover,
    onLeave: opts.onLeave,
    tooltip: opts.tooltip,
  };
}
