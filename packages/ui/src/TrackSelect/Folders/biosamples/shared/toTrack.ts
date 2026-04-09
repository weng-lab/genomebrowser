import {
  BigBedConfig,
  BigWigConfig,
  DisplayMode,
  MethylCConfig,
  Track,
  TrackType,
} from "@weng-lab/genomebrowser";
import { CreateTrackOptions } from "../../types";
import { BiosampleRowInfo } from "./types";

const assayColors: Record<string, string> = {
  dnase: "#06da93",
  h3k4me3: "#ff0000",
  h3k27ac: "#ffcd00",
  ctcf: "#00b0d0",
  atac: "#02c7b9",
  rnaseq: "#00aa00",
  chromhmm: "#00ff00",
  ccre: "#000000",
  wgbs: "#648bd8",
};

const defaultBigWig: Omit<BigWigConfig, "id" | "title" | "url"> = {
  trackType: TrackType.BigWig,
  height: 50,
  displayMode: DisplayMode.Full,
  titleSize: 12,
};

const defaultBigBed: Omit<BigBedConfig, "id" | "title" | "url"> = {
  trackType: TrackType.BigBed,
  height: 20,
  displayMode: DisplayMode.Dense,
  titleSize: 12,
};

const defaultMethylC: Omit<MethylCConfig, "id" | "title" | "urls"> = {
  trackType: TrackType.MethylC,
  height: 100,
  displayMode: DisplayMode.Split,
  titleSize: 12,
  color: "#648bd8",
  colors: {
    cpg: "#648bd8",
    chg: "#ff944d",
    chh: "#ff00ff",
    depth: "#525252",
  },
};

export function createBiosampleTrack(
  row: BiosampleRowInfo,
  _options: CreateTrackOptions,
): Track {
  const assay = row.assay.toLowerCase();
  const color = assayColors[assay] ?? "#000000";

  switch (assay) {
    case "chromhmm":
    case "ccre":
      return {
        ...defaultBigBed,
        id: row.id,
        url: row.url ?? "",
        title: row.displayName,
        color,
      };
    case "wgbs":
      return {
        ...defaultMethylC,
        id: row.id,
        title: row.displayName,
        maskCpgByCoverage: true,
        urls: {
          plusStrand: {
            cpg: { url: row.cpgPlus ?? "" },
            chg: { url: "" },
            chh: { url: "" },
            depth: { url: row.coverage ?? "" },
          },
          minusStrand: {
            cpg: { url: row.cpgMinus ?? "" },
            chg: { url: "" },
            chh: { url: "" },
            depth: { url: row.coverage ?? "" },
          },
        },
      };
    default:
      return {
        ...defaultBigWig,
        id: row.id,
        url: row.url ?? "",
        title: row.displayName,
        color,
      };
  }
}
