import { BaseConfig, TrackType } from "../types";

export interface LDTrackConfig extends BaseConfig {
  trackType: TrackType.LDTrack;
  signalURL: string;
  assembly: string;
}
