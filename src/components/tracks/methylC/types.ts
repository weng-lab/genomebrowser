import { BigWigData, ValuedPoint } from "../bigwig/types";
import { Config, DisplayMode, TrackDimensions, TrackType } from "../types";

export interface MethylCConfig extends Config<MethylData> {
  trackType: TrackType.MethylC;
  displayMode: DisplayMode.Split | DisplayMode.Combined;
  urls: {
    plusStrand: {
      cpg: {url: string, color: string},
      chg: {url: string, color: string},
      chh: {url: string, color: string},
      depth: {url: string, color: string},
    },
    minusStrand: {
      cpg: {url: string, color: string},
      chg: {url: string, color: string},
      chh: {url: string, color: string},
      depth: {url: string, color: string},
    }
  }
}

export type MethylData = ValuedPoint[][];

export interface MethylCProps {
  id: string;
  height: number;
  color: string;
  data: MethylData;
  dimensions: TrackDimensions;
  tooltip?: React.FC<BigWigData>;
  onClick?: (item: BigWigData) => void;
  onHover?: (item: BigWigData) => void;
  onLeave?: (item: BigWigData) => void;
}

