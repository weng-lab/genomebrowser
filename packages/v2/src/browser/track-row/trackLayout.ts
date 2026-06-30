import type { TrackInstance } from "../../modules/types";

export function getTrackWrapperHeight(track: TrackInstance<any, any>, titleSize: number) {
  return track.base.height + (track.base.title ? titleSize + 5 : 0);
}

export function getTrackTitleMargin(track: TrackInstance<any, any>, titleSize: number) {
  return track.base.title ? titleSize + 5 : 0;
}

export function getTracksHeight(tracks: TrackInstance<any, any>[], titleSize: number) {
  return tracks.reduce((total, track) => total + getTrackWrapperHeight(track, titleSize), 0);
}
