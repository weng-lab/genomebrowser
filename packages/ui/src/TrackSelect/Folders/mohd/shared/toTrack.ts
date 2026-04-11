import {
  BigBedConfig,
  BigWigConfig,
  DisplayMode,
  MethylCConfig,
  Track,
  TrackType,
  ValuedPoint,
} from "@weng-lab/genomebrowser";
import type { FC } from "react";
import { CreateTrackOptions } from "../../types";
import { createMohdFileUrl, getMohdOmeConfig } from "./config";
import { MohdFileRowInfo, MohdRowInfo, MohdWgbsMethylRowInfo } from "./types";

export type MohdTrackContext = {
  mohdSignalTooltip?: FC<ValuedPoint[]>;
  mohdMethylTooltip?: FC<ValuedPoint[]>;
};

const defaultBigWig: Omit<BigWigConfig, "id" | "title" | "url"> = {
  trackType: TrackType.BigWig,
  height: 30,
  displayMode: DisplayMode.Full,
  titleSize: 12,
  color: "#02c7b9",
};

const defaultBigBed: Omit<BigBedConfig, "id" | "title" | "url"> = {
  trackType: TrackType.BigBed,
  height: 20,
  displayMode: DisplayMode.Dense,
  titleSize: 12,
};

const defaultMethylC: Omit<MethylCConfig, "id" | "title" | "urls"> = {
  trackType: TrackType.MethylC,
  height: 75,
  displayMode: DisplayMode.Split,
  titleSize: 12,
  color: "#648bd8",
  maskCpgByCoverage: true,
  colors: {
    cpg: "#648bd8",
    chg: "#ff944d",
    chh: "#ff00ff",
    depth: "#525252",
  },
};

function isWgbsRow(row: MohdRowInfo): row is MohdWgbsMethylRowInfo {
  return row.kind === "wgbs-methyl";
}

function isFileRow(row: MohdRowInfo): row is MohdFileRowInfo {
  return row.kind === "file";
}

function createTrackTitle(row: MohdRowInfo) {
  return `${row.sampleId} ${row.description}`;
}

export function createMohdTrack(
  row: MohdRowInfo,
  options: CreateTrackOptions,
): Track | null {
  const trackContext = options.trackContext;

  if (isWgbsRow(row)) {
    return {
      ...defaultMethylC,
      id: row.id,
      title: createTrackTitle(row),
      tooltip: trackContext?.mohdMethylTooltip,
      urls: {
        plusStrand: {
          cpg: {
            url: createMohdFileUrl({
              ome: row.ome,
              sampleId: row.sampleId,
              filename: row.filenames.plusStrand.cpg,
            }),
          },
          chg: {
            url: createMohdFileUrl({
              ome: row.ome,
              sampleId: row.sampleId,
              filename: row.filenames.plusStrand.chg,
            }),
          },
          chh: {
            url: createMohdFileUrl({
              ome: row.ome,
              sampleId: row.sampleId,
              filename: row.filenames.plusStrand.chh,
            }),
          },
          depth: {
            url: createMohdFileUrl({
              ome: row.ome,
              sampleId: row.sampleId,
              filename: row.filenames.plusStrand.depth,
            }),
          },
        },
        minusStrand: {
          cpg: {
            url: createMohdFileUrl({
              ome: row.ome,
              sampleId: row.sampleId,
              filename: row.filenames.minusStrand.cpg,
            }),
          },
          chg: {
            url: createMohdFileUrl({
              ome: row.ome,
              sampleId: row.sampleId,
              filename: row.filenames.minusStrand.chg,
            }),
          },
          chh: {
            url: createMohdFileUrl({
              ome: row.ome,
              sampleId: row.sampleId,
              filename: row.filenames.minusStrand.chh,
            }),
          },
          depth: {
            url: createMohdFileUrl({
              ome: row.ome,
              sampleId: row.sampleId,
              filename: row.filenames.minusStrand.depth,
            }),
          },
        },
      },
    };
  }

  if (!isFileRow(row)) {
    return null;
  }

  const { color } = getMohdOmeConfig(row.ome);
  const url = createMohdFileUrl({
    ome: row.ome,
    sampleId: row.sampleId,
    filename: row.filename,
  });

  if (row.filename.endsWith(".bigWig")) {
    return {
      ...defaultBigWig,
      id: row.id,
      title: createTrackTitle(row),
      url,
      color,
      tooltip: trackContext?.mohdSignalTooltip,
    };
  }

  if (row.filename.endsWith(".bed.gz")) {
    return {
      ...defaultBigBed,
      id: row.id,
      title: createTrackTitle(row),
      url,
      color,
    };
  }

  return null;
}
