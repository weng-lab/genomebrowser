import { describe, expect, it } from "vitest";
import { createTrackStore } from "../../src/browser/track-state/trackStore";
import { bigBedModule } from "../../src/tracks/bigbed/module";
import { bigWigModule } from "../../src/tracks/bigwig/module";
import type { TrackConfigBase } from "../../src/modules/types";

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

    expect(store.getState().setTracks([nextTrack])).toEqual({ ok: true });
    expect(store.getState().tracks).toEqual([nextTrack]);

    expect(
      store.getState().setTracks([
        {
          id: "bad",
          type: "bigwig",
          title: "Bad",
          display: "full",
          height: 80,
        },
      ]),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig config is invalid/) });
    expect(store.getState().tracks).toEqual([nextTrack]);
  });

  it("validates added tracks", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [] });
    const track = bigWigTrack();

    expect(store.getState().addTrack(track)).toEqual({ ok: true });
    expect(store.getState().tracks).toEqual([track]);

    expect(store.getState().addTrack(track)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Duplicate track id/),
    });
    expect(
      store.getState().addTrack({
        id: "bad",
        type: "bigwig",
        title: "Bad",
        display: "full",
        height: 80,
      }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig config is invalid/) });
  });

  it("preserves interaction callbacks on initial tracks, added tracks, and updates", () => {
    const onClick = () => undefined;
    const onHover = () => undefined;
    const onLeave = () => undefined;
    const nextClick = () => undefined;
    const initial = bigWigModule.create({
      id: "signal",
      title: "Signal",
      url: "YOUR_URL_HERE",
      onClick,
      onHover,
      onLeave,
    });
    const store = createTrackStore({ modules: [bigWigModule], tracks: [initial] });

    expect(store.getState().getTrack("signal")).toMatchObject({
      onClick,
      onHover,
      onLeave,
    });

    const added = bigWigModule.create({
      id: "added",
      title: "Added",
      url: "YOUR_URL_HERE",
      onClick: nextClick,
    });
    store.getState().addTrack(added);
    expect(store.getState().getTrack("added")).toMatchObject({ onClick: nextClick });

    expect(
      store.getState().updateTrack("signal", { onClick: nextClick, onHover: undefined }),
    ).toEqual({ ok: true });
    expect(store.getState().getTrack("signal")).toMatchObject({
      onClick: nextClick,
      onLeave,
    });
    expect(store.getState().getTrack("signal")?.onHover).toBeUndefined();
  });

  it("rejects tooltip fields on tracks", () => {
    function Tooltip() {
      return null;
    }
    const store = createTrackStore({ modules: [bigWigModule], tracks: [] });

    expect(
      store.getState().addTrack({
        id: "signal",
        type: "bigwig",
        title: "Signal",
        display: "full",
        height: 80,
        url: "YOUR_URL_HERE",
        tooltip: Tooltip,
      } as never),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig config is invalid/) });

    store.getState().addTrack(bigWigTrack());
    expect(store.getState().updateTrack("signal", { tooltip: Tooltip } as never)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig config is invalid/),
    });
  });

  it("rejects invalid interaction updates", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });

    expect(
      store.getState().updateTrack("signal", { onClick: "not a function" as never }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig config is invalid/) });
  });

  it("validates merged updates and preserves id", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });

    expect(store.getState().updateTrack("signal", { id: "ignored", height: 120 })).toEqual({
      ok: true,
    });
    expect(store.getState().getTrack("signal")).toMatchObject({ id: "signal", height: 120 });
    expect(store.getState().getTrack("ignored")).toBeUndefined();

    expect(store.getState().updateTrack("signal", { url: "YOUR_OTHER_URL_HERE" })).toEqual({
      ok: true,
    });
    expect(store.getState().getTrack("signal")).toMatchObject({ url: "YOUR_OTHER_URL_HERE" });

    expect(store.getState().updateTrack("signal", { height: -1 })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig config is invalid/),
    });
    expect(store.getState().updateTrack("signal", { url: "" })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig config is invalid/),
    });
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

    expect(store.getState().updateTrack("signal", { yRange: { min: 5, max: 20 } })).toEqual({
      ok: true,
    });
    expect(store.getState().getTrack("signal")).toMatchObject({
      yRange: { min: 5, max: 20 },
    });

    expect(store.getState().updateTrack("signal", { yRange: { min: 20, max: 5 } })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig config is invalid/),
    });
    expect(store.getState().getTrack("signal")).toMatchObject({
      yRange: { min: 5, max: 20 },
    });
  });

  it("prevents type changes during update", () => {
    const store = createTrackStore({
      modules: [bigWigModule, bigBedModule],
      tracks: [bigWigTrack()],
    });

    expect(
      store.getState().updateTrack("signal", { type: "bigbed" } as Partial<TrackConfigBase>),
    ).toEqual({ ok: false, error: "Track type cannot be changed" });
  });
});
