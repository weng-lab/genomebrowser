import { Config, TrackType } from "../types";

export interface ImportanceConfig extends Config<any> {
  trackType: TrackType.Importance;
  url: string;
  signalURL: string;
}
