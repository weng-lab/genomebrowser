import type { AnyTrackInstance } from "../../modules/types";

export function getTrackWrapperHeight(track: AnyTrackInstance, titleSize: number) {
  return track.base.height + (track.base.title ? titleSize + 5 : 0);
}

export function getTrackTitleMargin(track: AnyTrackInstance, titleSize: number) {
  return track.base.title ? titleSize + 5 : 0;
}

export function getTracksHeight(tracks: AnyTrackInstance[], titleSize: number) {
  return tracks.reduce((total, track) => total + getTrackWrapperHeight(track, titleSize), 0);
}
