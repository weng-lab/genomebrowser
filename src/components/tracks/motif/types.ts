import { Config, TrackDimensions, TrackType } from "../types";

export interface MotifConfig extends Config<any> {
  trackType: TrackType.Motif;
  consensusRegex: string;
  peaksAccession: string;
  assembly: string;
  occurences: boolean;
  peakColor?: string;
}

export interface MotifProps {
  id: string;
  data: { occurrenceRect: MotifRect[]; peaks: MotifRect[] };
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
