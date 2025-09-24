import { Chromosome } from "../../../lib";
import { Config, TrackDimensions, TrackType } from "../types";

export interface ManhattanTrackConfig extends Config<any> {
  trackType: TrackType.Manhattan;
}

export interface ManhattanProps {
  id: string;
  data: any;
  height: number;
  color: string;
  dimensions: TrackDimensions;
  onClick?: (item: any) => void;
  onHover?: (item: any) => void;
  onLeave?: (item: any) => void;
  tooltip?: (item: any) => React.ReactNode;
}

export type ManhattanPoint = {
  chr: Chromosome;
  start: number;
  end: number;
  snpid: string;
  p_value: number;
  is_lead: boolean;
  associated_snps: string[];
};
