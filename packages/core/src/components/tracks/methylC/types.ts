import { ValuedPoint, YRange } from "../bigwig/types";
import { Config, DisplayMode, TrackDimensions, TrackType } from "../types";

export interface MethylCConfig extends Config<MethylData> {
  trackType: TrackType.MethylC;
  displayMode: DisplayMode.Split | DisplayMode.Combined;
  maskCpgByCoverage?: boolean;
  colors: {
    cpg: string;
    chg: string;
    chh: string;
    depth: string;
  };
  urls: {
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
  range?: YRange;
}

export type MethylData = ValuedPoint[];

export interface MethylCProps {
  id: string;
  height: number;
  maskCpgByCoverage?: boolean;
  colors: {
    cpg: string;
    chg: string;
    chh: string;
    depth: string;
  };
  data: MethylData[];
  dimensions: TrackDimensions;
  tooltip?: React.FC<ValuedPoint[]>;
  range?: YRange;
}
