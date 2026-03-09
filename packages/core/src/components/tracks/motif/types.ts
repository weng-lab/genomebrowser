import { TrackDimensions, TrackInstance } from "../types";

export interface MotifTrackData {
  occurrenceRect: MotifRect[];
  peaks: MotifRect[];
}

export interface MotifConfig extends TrackInstance<any> {
  consensusRegex: string;
  peaksAccession: string;
  assembly: string;
  peakColor?: string;
}

export interface MotifProps {
  id: string;
  data: MotifTrackData;
  height: number;
  dimensions: TrackDimensions;
  peakColor: string;
  color: string;
  onClick?: (rect: MotifRect) => void;
  onHover?: (rect: MotifRect) => void;
  onLeave?: (rect: MotifRect) => void;
  tooltip?: React.FC<MotifRect>;
}

export type DenseMotifProps = MotifProps;

export type SquishMotifProps = MotifProps;

export interface MotifRect {
  start: number;
  end: number;
  pwm?: number[][];
}
