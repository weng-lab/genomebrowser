import { validateRepeatMaskerLayout } from "../layout";
import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { getCachedBigBedFile } from "../../shared/cachedFiles";
import { standardRepeatMaskerSchema, type StandardRepeatMaskerConfig } from "./schema";
import { repeatCategory } from "./presentation";
import type { StandardRepeatMaskerData } from "./types";

export async function fetchStandardRepeatMasker({
  track,
  demand: { region, width },
  resources,
  signal,
}: TrackFetchContext<StandardRepeatMaskerConfig>): Promise<StandardRepeatMaskerData> {
  const file = getCachedBigBedFile(resources, track.config.url, standardRepeatMaskerSchema);
  const metadata = await file.getMetadata({ signal });
  validateRepeatMaskerLayout(metadata, "standard");
  if (region.end - region.start > track.config.maxDetailBases) {
    if (!metadata.zoomLevels.length) return { kind: "detail-required" };
    const target = (region.end - region.start) / Math.max(1, width) / 2;
    const reduction =
      metadata.zoomLevels.filter((level) => level <= target).at(-1) ?? metadata.zoomLevels[0]!;
    return { kind: "summary", summaries: await file.readZoomLevel(region, reduction, { signal }) };
  }
  const rows = await file.read(region, { signal });
  return {
    kind: "repeats",
    repeats: rows.map((row) => ({
      ...row,
      kind: "repeat" as const,
      category: repeatCategory(row.repClass),
    })),
  };
}
