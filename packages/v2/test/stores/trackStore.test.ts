import { describe, expect, it } from "vitest";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { bigBedModule } from "../../src/tracks/bigbed/module";
import { bigWigModule } from "../../src/tracks/bigwig/module";

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
            type: "bigwig",
            base: {
              id: "signal",
              title: "Signal",
              display: "full",
              height: 80,
            },
            config: {},
          },
        ],
      }),
    ).toThrow(/bigwig instance is invalid/);
  });

  it("rejects unknown track types", () => {
    expect(() =>
      createTrackStore({
        modules: [bigWigModule],
        tracks: [
          {
            type: "unknown",
            base: {
              id: "unknown",
              title: "Unknown",
              display: "full",
              height: 80,
            },
            config: {},
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
          type: "bigwig",
          base: {
            id: "bad",
            title: "Bad",
            display: "full",
            height: 80,
          },
          config: {},
        },
      ]),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig instance is invalid/) });
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
        type: "bigwig",
        base: {
          id: "bad",
          title: "Bad",
          display: "full",
          height: 80,
        },
        config: {},
      }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig instance is invalid/) });
  });

  it("applies bulk adds and removes in one update", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });
    const added = bigWigTrack("added");

    expect(
      store.getState().applyTrackChanges({ add: [added], remove: ["signal"] }),
    ).toEqual({ ok: true });
    expect(store.getState().tracks).toEqual([added]);
    expect(store.getState().order).toEqual(["added"]);
  });

  it("allows replacing a track id within one bulk change", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });
    const replacement = bigWigTrack("signal");

    expect(
      store.getState().applyTrackChanges({ add: [replacement], remove: ["signal"] }),
    ).toEqual({ ok: true });
    expect(store.getState().tracks).toEqual([replacement]);
  });

  it("rejects bulk changes atomically", () => {
    const initial = bigWigTrack();
    const store = createTrackStore({ modules: [bigWigModule], tracks: [initial] });

    expect(
      store.getState().applyTrackChanges({ add: [bigWigTrack("next")], remove: ["missing"] }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/No track found/) });
    expect(store.getState().tracks).toEqual([initial]);

    expect(
      store.getState().applyTrackChanges({
        add: [
          {
            type: "bigwig",
            base: {
              id: "bad",
              title: "Bad",
              display: "full",
              height: 80,
            },
            config: {},
          },
        ],
        remove: ["signal"],
      }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig instance is invalid/) });
    expect(store.getState().tracks).toEqual([initial]);

    expect(store.getState().applyTrackChanges({ add: [bigWigTrack()] })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Duplicate track id/),
    });
    expect(store.getState().tracks).toEqual([initial]);
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
      interaction: {
        onClick,
        onHover,
        onLeave,
      },
    });

    const added = bigWigModule.create({
      id: "added",
      title: "Added",
      url: "YOUR_URL_HERE",
      onClick: nextClick,
    });
    store.getState().addTrack(added);
    expect(store.getState().getTrack("added")).toMatchObject({
      interaction: { onClick: nextClick },
    });

    expect(
      store.getState().updateInteraction("signal", { onClick: nextClick, onHover: undefined }),
    ).toEqual({ ok: true });
    expect(store.getState().getTrack("signal")).toMatchObject({
      interaction: {
        onClick: nextClick,
        onLeave,
      },
    });
    expect(store.getState().getTrack("signal")?.interaction?.onHover).toBeUndefined();
  });

  it("rejects tooltip fields on tracks", () => {
    function Tooltip() {
      return null;
    }
    const store = createTrackStore({ modules: [bigWigModule], tracks: [] });

    expect(
      store.getState().addTrack({
        type: "bigwig",
        base: {
          id: "signal",
          title: "Signal",
          display: "full",
          height: 80,
        },
        config: {
          url: "YOUR_URL_HERE",
          tooltip: Tooltip,
        },
      } as never),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig instance is invalid/) });

    store.getState().addTrack(bigWigTrack());
    expect(store.getState().updateConfig("signal", { tooltip: Tooltip } as never)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig instance is invalid/),
    });
  });

  it("rejects invalid interaction updates", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });

    expect(
      store.getState().updateInteraction("signal", { onClick: "not a function" as never }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig instance is invalid/) });
  });

  it("validates split updates and preserves id", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });

    expect(store.getState().updateBase("signal", { id: "ignored", height: 120 })).toEqual({
      ok: true,
    });
    expect(store.getState().getTrack("signal")).toMatchObject({
      base: { id: "signal", height: 120 },
    });
    expect(store.getState().getTrack("ignored")).toBeUndefined();

    expect(store.getState().updateConfig("signal", { url: "YOUR_OTHER_URL_HERE" })).toEqual({
      ok: true,
    });
    expect(store.getState().getTrack("signal")).toMatchObject({
      config: { url: "YOUR_OTHER_URL_HERE" },
    });

    expect(store.getState().updateBase("signal", { height: -1 })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig instance is invalid/),
    });
    expect(store.getState().updateConfig("signal", { url: "" })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig instance is invalid/),
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
      config: { yRange: { min: 0, max: 10 } },
    });

    expect(store.getState().updateConfig("signal", { yRange: { min: 5, max: 20 } })).toEqual({
      ok: true,
    });
    expect(store.getState().getTrack("signal")).toMatchObject({
      config: { yRange: { min: 5, max: 20 } },
    });

    expect(store.getState().updateConfig("signal", { yRange: { min: 20, max: 5 } })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig instance is invalid/),
    });
    expect(store.getState().getTrack("signal")).toMatchObject({
      config: { yRange: { min: 5, max: 20 } },
    });
  });

  it("exposes split update APIs", () => {
    const store = createTrackStore({
      modules: [bigWigModule, bigBedModule],
      tracks: [bigWigTrack()],
    });

    expect(store.getState().updateBase).toBeTypeOf("function");
    expect(store.getState().updateConfig).toBeTypeOf("function");
    expect(store.getState().updateInteraction).toBeTypeOf("function");
  });
});
