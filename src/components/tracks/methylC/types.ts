import { Config, DisplayMode, TrackType } from "../types";

export interface MethylCConfig extends Config<MethylData> {
  trackType: TrackType.MethylC;
  url: string;
  displayMode: DisplayMode.Full;
  colors: {
    CpG: string;
    CHG: string;
    CHH: string;
    readDepth: string;
    noData: string;
  };
}

export type MethylData = unknown;

export const methylCConfig: MethylCConfig = {
  trackType: TrackType.MethylC,
  url: "",
  displayMode: DisplayMode.Full,
  id: "",
  title: "",
  height: 100,
  color: "#000000",
  colors: {
    CpG: "#000000",
    CHG: "#000000",
    CHH: "#000000",
    readDepth: "#000000",
    noData: "#000000",
  },
};
