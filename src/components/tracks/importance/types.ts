import { BaseConfig, TrackType } from "../types";

export interface ImportanceConfig extends BaseConfig {
  trackType: TrackType.Importance;
  url: string;
  signalURL: string;
}
