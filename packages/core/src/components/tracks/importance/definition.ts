import { TrackDefinition, TrackInstance } from "../types";
import { FetcherContext, getBigDataRace } from "../../../api/fetchers";
import Importance from "./importance";
import type { ImportanceTrackAnnotation } from "./types";
import type { SVGProps } from "react";

export type ImportanceTrack = TrackInstance & {
  displayMode: "full";
  url: string;
  signalURL: string;
  annotations?: ImportanceTrackAnnotation[];
  zeroLineProps?: SVGProps<SVGLineElement>;
};

async function fetchImportance(ctx: FetcherContext) {
  const track = ctx.track as ImportanceTrack;
  const { domain, queries } = ctx;

  const [sequenceData, signalData] = await Promise.all([
    getBigDataRace(track.url, domain, -1, queries),
    getBigDataRace(track.signalURL, domain, -1, queries),
  ]);

  return {
    data: {
      sequence: typeof sequenceData === "string" ? sequenceData : "",
      importance: Array.isArray(signalData) ? signalData.map((point: { value: number }) => point.value) : [],
    },
    error: null,
  };
}

export const ImportanceDefinition: TrackDefinition<"full"> = {
  type: "importance",
  defaultDisplayMode: "full",
  defaultHeight: 75,
  renderers: {
    full: Importance,
  },
  fetcher: fetchImportance,
};

export function createImportanceTrack(opts: {
  id: string;
  title: string;
  url: string;
  signalURL: string;
  height?: number;
  displayMode?: "full";
  color?: string;
  titleSize?: number;
  annotations?: ImportanceTrackAnnotation[];
  zeroLineProps?: SVGProps<SVGLineElement>;
}): ImportanceTrack {
  return {
    type: ImportanceDefinition.type,
    displayMode: opts.displayMode ?? ImportanceDefinition.defaultDisplayMode,
    height: opts.height ?? ImportanceDefinition.defaultHeight,
    id: opts.id,
    title: opts.title,
    url: opts.url,
    signalURL: opts.signalURL,
    color: opts.color,
    titleSize: opts.titleSize,
    annotations: opts.annotations ?? [],
    zeroLineProps: opts.zeroLineProps,
  };
}
