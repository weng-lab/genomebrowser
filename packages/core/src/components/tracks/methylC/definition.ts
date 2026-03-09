import { Track, TrackDefinition } from "../types";
import { FetcherContext, fetchBigBedUrl } from "../../../api/fetchers";
import SplitMethylC from "./split";
import CombinedMethylC from "./combined";
import type { YRange } from "../bigwig/types";
import type { MethylCColors, MethylCUrls, MethylData } from "./types";

export type MethylCTrack = Track & {
  displayMode: "split" | "combined";
  colors: MethylCColors;
  urls: MethylCUrls;
  range?: YRange;
};

async function fetchMethylC(ctx: FetcherContext) {
  const track = ctx.track as MethylCTrack;
  const channelUrls = [
    track.urls.plusStrand.cpg.url,
    track.urls.plusStrand.chg.url,
    track.urls.plusStrand.chh.url,
    track.urls.plusStrand.depth.url,
    track.urls.minusStrand.cpg.url,
    track.urls.minusStrand.chg.url,
    track.urls.minusStrand.chh.url,
    track.urls.minusStrand.depth.url,
  ];

  const results = await Promise.all(
    channelUrls.map(async (url) => {
      if (!url) {
        return { data: [] as MethylData, error: null };
      }

      const result = await fetchBigBedUrl(url, ctx);
      return {
        data: (result.data as MethylData | null) ?? [],
        error: result.error,
      };
    })
  );

  return {
    data: results.map((result) => result.data),
    error:
      results
        .map((result) => result.error)
        .filter((error): error is string => Boolean(error))
        .join("\n") || null,
  };
}

export const MethylCDefinition: TrackDefinition<"split" | "combined"> = {
  type: "methylC",
  defaultDisplayMode: "split",
  defaultHeight: 100,
  renderers: {
    split: SplitMethylC,
    combined: CombinedMethylC,
  },
  fetcher: fetchMethylC,
};

export function createMethylCTrack(opts: {
  id: string;
  title: string;
  colors: MethylCColors;
  urls: MethylCUrls;
  height?: number;
  displayMode?: "split" | "combined";
  color?: string;
  titleSize?: number;
  range?: YRange;
  tooltip?: React.FC<any>;
}): MethylCTrack {
  return {
    type: MethylCDefinition.type,
    displayMode: opts.displayMode ?? MethylCDefinition.defaultDisplayMode,
    height: opts.height ?? MethylCDefinition.defaultHeight,
    id: opts.id,
    title: opts.title,
    colors: opts.colors,
    urls: opts.urls,
    color: opts.color,
    titleSize: opts.titleSize,
    range: opts.range,
    tooltip: opts.tooltip,
  };
}
