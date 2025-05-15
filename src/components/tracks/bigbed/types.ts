import { BaseConfig, TrackType } from "../types";

export interface BigBedConfig extends BaseConfig {
  trackType: TrackType.BigBed;
  url: string;
  rowHeight?: number;
}

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
