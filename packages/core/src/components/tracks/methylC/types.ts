import { ValuedPoint, YRange } from "../bigwig/types";
import { TrackDimensions, TrackInstance } from "../types";

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

export interface MethylCConfig extends TrackInstance<MethylData> {
  displayMode: "split" | "combined";
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
