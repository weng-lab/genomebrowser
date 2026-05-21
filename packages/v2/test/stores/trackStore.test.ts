import { describe, expect, it } from "vitest";
import { bigBedModule, bigWigModule, createTrackStore } from "../../src";
import type { TrackConfigBase } from "../../src/sdk";

describe("createTrackStore", () => {
  function bigWigTrack(id = "signal") {
    return bigWigModule.create({
      id,
      title: "Signal",
      url: "YOUR_URL_HERE",
    });
  }

  it("validates initial tracks with their modules", () => {
    const track = bigWigTrack();
    const store = createTrackStore({ modules: [bigWigModule], tracks: [track] });

    expect(store.getState().tracks).toEqual([track]);
  });

  it("rejects module-invalid initial tracks", () => {
    expect(() =>
      createTrackStore({
        modules: [bigWigModule],
        tracks: [
          {
            id: "signal",
            type: "bigwig",
            title: "Signal",
            display: "full",
            height: 80,
          },
        ],
      }),
    ).toThrow(/bigwig config is invalid/);
  });

  it("rejects unknown track types", () => {
    expect(() =>
      createTrackStore({
        modules: [bigWigModule],
        tracks: [
          {
            id: "unknown",
            type: "unknown",
            title: "Unknown",
            display: "full",
            height: 80,
          },
        ],
      }),
    ).toThrow(/No track module registered/);
  });

  it("rejects duplicate track ids after module validation", () => {
    expect(() =>
      createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack(), bigWigTrack()] }),
    ).toThrow(/Duplicate track id/);
  });

  it("validates setTracks replacements", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });
    const nextTrack = bigWigTrack("next");

    store.getState().setTracks([nextTrack]);
    expect(store.getState().tracks).toEqual([nextTrack]);

    expect(() =>
      store.getState().setTracks([
        {
          id: "bad",
          type: "bigwig",
          title: "Bad",
          display: "full",
          height: 80,
        },
      ]),
    ).toThrow(/bigwig config is invalid/);
    expect(store.getState().tracks).toEqual([nextTrack]);
  });

  it("validates added tracks", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [] });
    const track = bigWigTrack();

    store.getState().addTrack(track);
    expect(store.getState().tracks).toEqual([track]);

    expect(() => store.getState().addTrack(track)).toThrow(/Duplicate track id/);
    expect(() =>
      store.getState().addTrack({
        id: "bad",
        type: "bigwig",
        title: "Bad",
        display: "full",
        height: 80,
      }),
    ).toThrow(/bigwig config is invalid/);
  });

  it("validates merged updates and preserves id", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });

    store.getState().updateTrack("signal", { id: "ignored", height: 120 });
    expect(store.getState().getTrack("signal")).toMatchObject({ id: "signal", height: 120 });
    expect(store.getState().getTrack("ignored")).toBeUndefined();

    store.getState().updateTrack("signal", { url: "YOUR_OTHER_URL_HERE" });
    expect(store.getState().getTrack("signal")).toMatchObject({ url: "YOUR_OTHER_URL_HERE" });

    expect(() => store.getState().updateTrack("signal", { height: -1 })).toThrow(
      /bigwig config is invalid/,
    );
    expect(() => store.getState().updateTrack("signal", { url: "" })).toThrow(
      /bigwig config is invalid/,
    );
  });

  it("persists BigWig yRange from initial config and external updates", () => {
    const store = createTrackStore({
      modules: [bigWigModule],
      tracks: [
        bigWigModule.create({
          id: "signal",
          title: "Signal",
          url: "YOUR_URL_HERE",
          yRange: { min: 0, max: 10 },
        }),
      ],
    });

    expect(store.getState().getTrack("signal")).toMatchObject({
      yRange: { min: 0, max: 10 },
    });

    store.getState().updateTrack("signal", { yRange: { min: 5, max: 20 } });
    expect(store.getState().getTrack("signal")).toMatchObject({
      yRange: { min: 5, max: 20 },
    });

    expect(() =>
      store.getState().updateTrack("signal", { yRange: { min: 20, max: 5 } }),
    ).toThrow(/bigwig config is invalid/);
    expect(store.getState().getTrack("signal")).toMatchObject({
      yRange: { min: 5, max: 20 },
    });
  });

  it("prevents type changes during update", () => {
    const store = createTrackStore({
      modules: [bigWigModule, bigBedModule],
      tracks: [bigWigTrack()],
    });

    expect(() =>
      store.getState().updateTrack("signal", { type: "bigbed" } as Partial<TrackConfigBase>),
    ).toThrow(/Track type cannot be changed/);
  });
});
