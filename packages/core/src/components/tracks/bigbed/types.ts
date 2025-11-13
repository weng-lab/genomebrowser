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
  verticalPadding?: number; // Vertical padding as fraction of height (default 0.2 = 20%)
  onClick?: (rect: Rect) => void;
  onHover?: (rect: Rect) => void;
  onLeave?: (rect: Rect) => void;
  tooltip?: React.FC<Rect>;
}

export type SquishBigBedProps = BigBedProps;

export type DenseBigBedProps = BigBedProps;

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
