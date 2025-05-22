import { TrackType, TrackDimensions, Config } from "../types";

export interface BigBedConfig extends Config<Rect> {
  trackType: TrackType.BigBed;
  url: string;
}

interface BigBedProps {
  id: string;
  data: Rect[];
  color: string;
  height: number;
  dimensions: TrackDimensions;
  onClick?: (rect: Rect) => void;
  onHover?: (rect: Rect) => void;
  onLeave?: (rect: Rect) => void;
  tooltip?: React.FC<Rect>;
}

export interface SquishBigBedProps extends BigBedProps {}

export interface DenseBigBedProps extends BigBedProps {}

export interface Rect {
  start: number;
  end: number;
  color?: string;
  name?: string;
  score?: number;
}

export interface SquishRect {
  start: number;
  end: number;
  color?: string;
  rectname?: string;
  score?: number;
}
