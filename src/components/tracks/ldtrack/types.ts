import { Config, TrackType } from "../types";

export interface LDTrackConfig extends Config<any> {
  trackType: TrackType.LDTrack;
  signalURL: string;
  assembly: string;
}
