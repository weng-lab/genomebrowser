import { TrackDefinition, TrackInstance } from "../types";
import { FetcherContext, fetchBigBedUrl } from "../../../api/fetchers";
import BulkBed from "./bulkbed";
import BulkBedSettings from "./settings";
import type { BulkBedDataset, BulkBedRect } from "./types";

export type BulkBedTrack = TrackInstance & {
  displayMode: "full";
  datasets: BulkBedDataset[];
  gap?: number;
};

async function fetchBulkBed(ctx: FetcherContext) {
  const track = ctx.track as BulkBedTrack;
  const results = await Promise.all(
    track.datasets.map(async (dataset) => {
      if (!dataset.url) {
        return { name: dataset.name, data: [] as BulkBedRect[], error: null };
      }

      const result = await fetchBigBedUrl(dataset.url, ctx);
      return {
        name: dataset.name,
        data: (result.data as BulkBedRect[] | null) ?? [],
        error: result.error,
      };
    })
  );

  return {
    data: results.map((result) => result.data),
    error:
      results
        .filter((result) => result.error)
        .map((result) => `${result.name}: ${result.error}`)
        .join("\n") || null,
  };
}

export const BulkBedDefinition: TrackDefinition<"full"> = {
  type: "bulkbed",
  defaultDisplayMode: "full",
  defaultHeight: 80,
  renderers: {
    full: BulkBed,
  },
  fetcher: fetchBulkBed,
  settingsPanel: BulkBedSettings,
};

export function createBulkBedTrack(opts: {
  id: string;
  title: string;
  datasets: BulkBedDataset[];
  height?: number;
  displayMode?: "full";
  color?: string;
  titleSize?: number;
  gap?: number;
  onClick?: (item: any) => void;
  onHover?: (item: any) => void;
  onLeave?: (item: any) => void;
  tooltip?: React.FC<any>;
}): BulkBedTrack {
  return {
    type: BulkBedDefinition.type,
    displayMode: opts.displayMode ?? BulkBedDefinition.defaultDisplayMode,
    height: opts.height ?? BulkBedDefinition.defaultHeight,
    id: opts.id,
    title: opts.title,
    datasets: opts.datasets,
    color: opts.color,
    titleSize: opts.titleSize,
    gap: opts.gap,
    onClick: opts.onClick,
    onHover: opts.onHover,
    onLeave: opts.onLeave,
    tooltip: opts.tooltip,
  };
}
