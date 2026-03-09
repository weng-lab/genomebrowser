import { Chromosome } from "../../../utils/types";
import { TrackDimensions, TrackInstance } from "../types";

export interface ManhattanTrackConfig extends TrackInstance<any> {
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
