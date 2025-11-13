import { SVGProps } from "react";
import { Config, TrackDimensions, TrackType } from "../types";

export interface ImportanceConfig extends Omit<Config<any>, "onHover" | "onLeave"> {
  trackType: TrackType.Importance;
  url: string; // 2bit file
  signalURL: string; // bigWig signal file
}

export interface ImportanceProps {
  data: ImportanceTrackData;
  annotations: ImportanceTrackAnnotation[];
  dimensions: TrackDimensions;
  height: number;
  zeroLineProps?: SVGProps<SVGLineElement>;
}

export type ImportanceTrackSequence = {
  sequence: string;
  importance: number[];
};

export type ImportanceTrackDataPoint = {
  base: string;
  importance: number;
};

export type ImportanceTrackData = ImportanceTrackDataPoint[] | ImportanceTrackSequence;

export type ImportanceTrackAnnotation = {
  coordinates: [number, number];
  color: string;
  onMouseOver?: () => void;
  children?: React.ReactElement[];
};
