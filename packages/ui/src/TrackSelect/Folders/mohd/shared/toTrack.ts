import {
  BigWigConfig,
  DisplayMode,
  MethylCConfig,
  Track,
  TrackType,
} from "@weng-lab/genomebrowser";
import { CreateTrackOptions } from "../../types";
import { MohdRowInfo, MohdWgbsTrackInfo } from "./types";

const assayColors: Record<string, string> = {
  ATAC: "#02c7b9",
  RNA: "#00aa00",
};

const defaultBigWig: Omit<BigWigConfig, "id" | "title" | "url"> = {
  trackType: TrackType.BigWig,
  height: 30,
  displayMode: DisplayMode.Full,
  titleSize: 12,
  color: "#02c7b9",
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

function isWgbsRow(row: MohdRowInfo): row is MohdRowInfo & MohdWgbsTrackInfo {
  return row.assay === "WGBS" && "urls" in row;
}

export function createMohdTrack(
  row: MohdRowInfo,
  _options: CreateTrackOptions,
): Track | null {
  if (isWgbsRow(row)) {
    return {
      ...defaultMethylC,
      id: row.id,
      title: row.fileName,
      urls: {
        plusStrand: {
          cpg: { url: row.urls.plusStrand.cpg },
          chg: { url: row.urls.plusStrand.chg },
          chh: { url: row.urls.plusStrand.chh },
          depth: { url: row.urls.plusStrand.depth },
        },
        minusStrand: {
          cpg: { url: row.urls.minusStrand.cpg },
          chg: { url: row.urls.minusStrand.chg },
          chh: { url: row.urls.minusStrand.chh },
          depth: { url: row.urls.minusStrand.depth },
        },
      },
    };
  }

  if (!row.fileName.endsWith(".bigWig")) {
    return null;
  }

  return {
    ...defaultBigWig,
    id: row.id,
    title: row.fileName,
    url: row.url,
    color: assayColors[row.assay] ?? defaultBigWig.color,
  };
}
