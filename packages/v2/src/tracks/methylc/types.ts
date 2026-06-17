import type { TrackConfigBase, TrackInteractionConfig } from "../../modules/types";
import type { BigWigData, RenderedBigWigPoint, YRange } from "../bigwig/types";

export type MethylCDisplay = "split";

export type MethylCColors = {
  cpg: string;
  chg: string;
  chh: string;
  depth: string;
};

export type MethylCStrandUrls = {
  cpg: { url: string };
  chg: { url: string };
  chh: { url: string };
  depth: { url: string };
};

export type MethylCUrls = {
  plusStrand: MethylCStrandUrls;
  minusStrand: MethylCStrandUrls;
};

export type MethylCRenderedPoint = RenderedBigWigPoint;

export type MethylCData = BigWigData[][];

export type MethylCShowRows = {
  fwdCpg: boolean;
  fwdChg: boolean;
  fwdChh: boolean;
  fwdDepth: boolean;
  revCpg: boolean;
  revChg: boolean;
  revChh: boolean;
  revDepth: boolean;
};

export type MethylCTooltipItem = {
  tooltipValues: MethylCRenderedPoint[];
  showRows: MethylCShowRows;
};

export interface MethylCConfig
  extends
    Omit<TrackConfigBase, keyof TrackInteractionConfig<any, any>>,
    TrackInteractionConfig<MethylCTooltipItem, MethylCConfig> {
  type: "methylc";
  display: MethylCDisplay;
  colors: MethylCColors;
  urls: MethylCUrls;
  maskCpgByCoverage?: boolean;
  range?: YRange;
}

export type MethylCInput = {
  id: string;
  title: string;
  display?: MethylCDisplay;
  height?: number;
  color?: string;
  colors?: Partial<MethylCColors>;
  urls: MethylCUrls;
  maskCpgByCoverage?: boolean;
  range?: YRange;
} & Partial<TrackInteractionConfig<MethylCTooltipItem, MethylCConfig>>;
