import { describe, expect, it } from "vitest";

import { DisplayMode, TrackType } from "../components/tracks/types";
import { Track, createTrackStore } from "./trackStore";

const makeTrack = (id: string): Track => ({
  id,
  title: id,
  height: 40,
  displayMode: DisplayMode.Full,
  trackType: TrackType.Manhattan,
});

describe("trackStore bulk operations", () => {
  it("appends bulk inserted tracks by default", () => {
    const trackStore = createTrackStore([makeTrack("existing")]);

    trackStore.getState().insertTracks([makeTrack("managed-a"), makeTrack("managed-b")]);

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual(["existing", "managed-a", "managed-b"]);
  });

  it("removes only the requested tracks in bulk", () => {
    const trackStore = createTrackStore([
      makeTrack("external"),
      makeTrack("managed-a"),
      makeTrack("managed-b"),
      makeTrack("managed-c"),
    ]);

    trackStore.getState().removeTracks(["managed-a", "managed-c", "missing"]);

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual(["external", "managed-b"]);
  });
});
