import { ValuedPoint, YRange } from "../bigwig/types";
import { Config, DisplayMode, TrackDimensions, TrackType } from "../types";

export type MethylCColors = {
  cpg: string;
  chg: string;
  chh: string;
  depth: string;
};

export type MethylCUrls = {
  plusStrand: {
    cpg: { url: string };
    chg: { url: string };
    chh: { url: string };
    depth: { url: string };
  };
  minusStrand: {
    cpg: { url: string };
    chg: { url: string };
    chh: { url: string };
    depth: { url: string };
  };
};

export interface MethylCConfig extends Config<MethylData> {
  trackType: TrackType.MethylC;
  displayMode: DisplayMode.Split | DisplayMode.Combined;
  colors: MethylCColors;
  urls: MethylCUrls;
  range?: YRange;
}

export type MethylData = ValuedPoint[];

export interface MethylCProps {
  id: string;
  height: number;
  colors: MethylCColors;
  data: MethylData[];
  dimensions: TrackDimensions;
  tooltip?: React.FC<ValuedPoint[]>;
  range?: YRange;
}

export interface MethylCRendererProps extends MethylCProps {
  urls: MethylCUrls;
}
