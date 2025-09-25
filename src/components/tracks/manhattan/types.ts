import { Chromosome } from "../../../lib";
import { Config, TrackDimensions, TrackType } from "../types";

export interface ManhattanTrackConfig extends Config<any> {
  trackType: TrackType.Manhattan;
  cutoffValue?: number;
  cutoffLabel?: string;
  lead?: string;
  associatedSnps?: string[]; // list of snpIds to be highlighted
}

export interface ManhattanProps {
  id: string;
  data: any;
  cutoffValue?: number;
  cutoffLabel?: string;
  associatedSnps?: string[]; // list of snpIds to be highlighted
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
  snpId: string;
  value: number;
};
