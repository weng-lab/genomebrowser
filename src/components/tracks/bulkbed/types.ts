import { TrackType, TrackDimensions, Config } from "../types";

export interface BulkBedConfig extends Config<Rect> {
  trackType: TrackType.BulkBed;
  urls: string[];
  gap?: number; // Gap between instances
}

export interface BulkBedProps {
  id: string;
  data: Rect[][];
  color: string;
  height: number;
  dimensions: TrackDimensions;
  gap?: number;
  onClick?: (rect: Rect) => void;
  onHover?: (rect: Rect) => void;
  onLeave?: (rect: Rect) => void;
  tooltip?: React.FC<Rect>;
}

export interface Rect {
  start: number;
  end: number;
  color?: string;
  name?: string;
  score?: number;
}