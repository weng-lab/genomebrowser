import type { TrackConfigBase } from "../../modules/types";

export function getTrackWrapperHeight(track: TrackConfigBase, titleSize: number) {
  return track.height + (track.title ? titleSize + 5 : 0);
}

export function getTrackTitleMargin(track: TrackConfigBase, titleSize: number) {
  return track.title ? titleSize + 5 : 0;
}

export function getTracksHeight(tracks: TrackConfigBase[], titleSize: number) {
  return tracks.reduce((total, track) => total + getTrackWrapperHeight(track, titleSize), 0);
}
