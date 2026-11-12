import { validateRepeatMaskerLayout } from "./layout";
import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { fetchStandardRepeatMasker } from "./standard/fetch";
import { fetchBigRmsk } from "./joined/fetch";
import { bigRmskSchema } from "./joined/schema";
import { getCachedBigBedFile } from "../shared/cachedFiles";
import { standardConfig, joinedConfig, type RepeatMaskerConfig } from "./schema";
import type { RepeatMaskerData } from "./types";

export async function fetchRepeatMasker(
  context: TrackFetchContext<RepeatMaskerConfig>,
): Promise<RepeatMaskerData> {
  const {
    track,
    demand: { region, width },
    resources,
    signal,
  } = context;
  if (track.config.view === "standard") {
    return {
      view: "standard",
      url: track.config.sources.standard,
      data: await fetchStandardRepeatMasker({
        ...context,
        track: { ...track, config: standardConfig(track.config) },
      }),
    };
  }
  const url = track.config.sources.joined;
  const file = getCachedBigBedFile(resources, url, bigRmskSchema);
  const metadata = await file.getMetadata({ signal });
  validateRepeatMaskerLayout(metadata, "joined");
  if (region.end - region.start > track.config.maxDetailBases) {
    if (!metadata.zoomLevels.length)
      return { view: "joined-summary", url, data: { kind: "detail-required" } };
    const target = (region.end - region.start) / Math.max(1, width) / 2;
    const reduction =
      metadata.zoomLevels.filter((level) => level <= target).at(-1) ?? metadata.zoomLevels[0]!;
    return {
      view: "joined-summary",
      url,
      data: { kind: "summary", summaries: await file.readZoomLevel(region, reduction, { signal }) },
    };
  }
  return {
    view: "joined",
    url,
    data: await fetchBigRmsk({
      ...context,
      track: { ...track, config: joinedConfig(track.config) },
    }),
  };
}
