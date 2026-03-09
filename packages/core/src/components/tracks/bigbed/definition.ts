import { TrackDefinition, TrackInstance } from "../types";
import { FetcherContext, fetchBigBedUrl } from "../../../api/fetchers";
import DenseBigBed from "./dense";
import SquishBigBed from "./squish";

// --- Concrete track type ---

export type BigBedTrack = TrackInstance & {
  displayMode: "dense" | "squish";
  url: string;
};

// --- Fetcher ---

async function fetchBigBed(ctx: FetcherContext) {
  const track = ctx.track as BigBedTrack;
  return await fetchBigBedUrl(track.url, ctx);
}

// --- Definition ---

export const BigBedDefinition: TrackDefinition<"dense" | "squish"> = {
  type: "bigbed",
  defaultDisplayMode: "dense",
  defaultHeight: 20,
  renderers: {
    dense: DenseBigBed,
    squish: SquishBigBed,
  },
  fetcher: fetchBigBed,
  settingsPanel: undefined,
};

// --- Factory ---

export function createBigBedTrack(opts: {
  id: string;
  title: string;
  url: string;
  height?: number;
  displayMode?: "dense" | "squish";
  color?: string;
  titleSize?: number;

  onClick?: (item: any) => void;
  onHover?: (item: any) => void;
  onLeave?: (item: any) => void;
  tooltip?: React.FC<any>;
}): BigBedTrack {
  return {
    type: BigBedDefinition.type,
    displayMode: opts.displayMode ?? BigBedDefinition.defaultDisplayMode,
    height: opts.height ?? BigBedDefinition.defaultHeight,
    id: opts.id,
    title: opts.title,
    url: opts.url,
    color: opts.color,
    titleSize: opts.titleSize,

    onClick: opts.onClick,
    onHover: opts.onHover,
    onLeave: opts.onLeave,
    tooltip: opts.tooltip,
  };
}
