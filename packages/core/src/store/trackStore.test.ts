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

  it("reorders tracks using the provided ids", () => {
    const trackA = makeTrack("a");
    const trackB = makeTrack("b");
    const trackC = makeTrack("c");
    const trackStore = createTrackStore([trackA, trackB, trackC]);

    trackStore.getState().reorderTracks(["c", "a", "b"]);

    expect(trackStore.getState().ids).toEqual(["c", "a", "b"]);
    expect(trackStore.getState().tracks).toEqual([trackC, trackA, trackB]);
  });

  it("throws when reordering omits an existing id", () => {
    const trackStore = createTrackStore([makeTrack("a"), makeTrack("b"), makeTrack("c")]);

    expect(() => trackStore.getState().reorderTracks(["c", "a"])).toThrowError("Invalid track order");
  });

  it("throws when reordering includes an unknown id", () => {
    const trackStore = createTrackStore([makeTrack("a"), makeTrack("b"), makeTrack("c")]);

    expect(() => trackStore.getState().reorderTracks(["c", "a", "missing"])).toThrowError("Invalid track order");
  });

  it("throws when reordering includes a duplicate id", () => {
    const trackStore = createTrackStore([makeTrack("a"), makeTrack("b"), makeTrack("c")]);

    expect(() => trackStore.getState().reorderTracks(["c", "a", "a"])).toThrowError("Invalid track order");
  });
});
