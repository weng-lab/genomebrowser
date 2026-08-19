import { describe, expect, it, vi } from "vitest";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { bigBedModule } from "../../src/tracks/bigbed/module";
import { bigWigModule } from "../../src/tracks/bigwig/module";

describe("createTrackStore", () => {
  function bigWigTrack(id = "signal") {
    return bigWigModule.create({
      id,
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
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
              color: "#000000",
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
              color: "#000000",
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
            color: "#000000",
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
          color: "#000000",
        },
        config: {},
      }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig instance is invalid/) });
  });

  it("applies bulk adds and removes in one update", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });
    const added = bigWigTrack("added");

    expect(store.getState().applyTrackChanges({ add: [added], remove: ["signal"] })).toEqual({
      ok: true,
    });
    expect(store.getState().tracks).toEqual([added]);
    expect(store.getState().order).toEqual(["added"]);
  });

  it("allows replacing a track id within one bulk change", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });
    const replacement = bigWigTrack("signal");

    expect(store.getState().applyTrackChanges({ add: [replacement], remove: ["signal"] })).toEqual({
      ok: true,
    });
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
              color: "#000000",
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
    const initial = bigWigModule.create(
      {
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      },
      { onClick, onHover, onLeave },
    );
    const store = createTrackStore({ modules: [bigWigModule], tracks: [initial] });

    expect(store.getState().getTrack("signal")).toMatchObject({
      interaction: {
        onClick,
        onHover,
        onLeave,
      },
    });

    const added = bigWigModule.create(
      {
        id: "added",
        title: "Added",
        config: { url: "YOUR_URL_HERE" },
      },
      { onClick: nextClick },
    );
    store.getState().addTrack(added);
    expect(store.getState().getTrack("added")).toMatchObject({
      interaction: { onClick: nextClick },
    });

    expect(
      store
        .getState()
        .updateTrack("signal", { interaction: { onClick: nextClick, onHover: undefined } }),
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
          color: "#000000",
        },
        config: {
          url: "YOUR_URL_HERE",
          tooltip: Tooltip,
        },
      } as never),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig instance is invalid/) });

    store.getState().addTrack(bigWigTrack());
    expect(
      store.getState().updateTrack("signal", { config: { tooltip: Tooltip } } as never),
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig instance is invalid/),
    });
  });

  it("rejects invalid interaction updates", () => {
    const store = createTrackStore({ modules: [bigWigModule], tracks: [bigWigTrack()] });
    const initialTrack = store.getState().getTrack("signal");

    expect(
      store
        .getState()
        .updateTrack("signal", { interaction: { onClick: "not a function" as never } }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/bigwig instance is invalid/) });
    expect(store.getState().getTrack("signal")).toBe(initialTrack);
  });

  it("validates base, config, and interaction patches atomically while preserving identity", () => {
    const onHover = () => undefined;
    const nextClick = () => undefined;
    const signalTrack = bigWigModule.create(
      {
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      },
      { onHover },
    );
    const unchangedTrack = bigWigTrack("unchanged");
    const store = createTrackStore({
      modules: [bigWigModule],
      tracks: [signalTrack, unchangedTrack],
    });
    const validate = vi.spyOn(bigWigModule, "validate");
    const subscriber = vi.fn();
    const unsubscribe = store.subscribe(subscriber);
    const initialOrder = store.getState().order;
    const initialUnchangedTrack = store.getState().getTrack("unchanged");

    expect(
      store.getState().updateTrack("signal", {
        type: "ignored",
        base: { id: "ignored", height: 120 },
        config: { url: "YOUR_OTHER_URL_HERE" },
        interaction: { onClick: nextClick },
      } as never),
    ).toEqual({ ok: true });
    expect(validate).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(store.getState().getTrack("signal")).toMatchObject({
      type: "bigwig",
      base: { id: "signal", height: 120 },
      config: { url: "YOUR_OTHER_URL_HERE" },
      interaction: { onClick: nextClick, onHover },
    });
    expect(store.getState().getTrack("ignored")).toBeUndefined();
    expect(store.getState().getTrack("unchanged")).toBe(initialUnchangedTrack);
    expect(store.getState().order).toBe(initialOrder);

    const accepted = store.getState().getTrack("signal");
    expect(
      store.getState().updateTrack("signal", {
        base: { height: 140 },
        config: { url: "" },
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig instance is invalid/),
    });
    expect(store.getState().getTrack("signal")).toBe(accepted);
    expect(store.getState().getTrack("signal")).toMatchObject({
      base: { height: 120 },
      config: { url: "YOUR_OTHER_URL_HERE" },
    });
    expect(subscriber).toHaveBeenCalledTimes(1);

    expect(
      store.getState().updateTrack("signal", {
        base: { color: "rebeccapurple" },
        config: { clampIndicatorColor: "#abc" },
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/six-digit hexadecimal color/),
    });
    expect(store.getState().getTrack("signal")).toBe(accepted);
    expect(subscriber).toHaveBeenCalledTimes(1);
    unsubscribe();
    validate.mockRestore();
  });

  it("persists BigWig yRange from initial config and external updates", () => {
    const store = createTrackStore({
      modules: [bigWigModule],
      tracks: [
        bigWigModule.create({
          id: "signal",
          title: "Signal",
          config: {
            url: "YOUR_URL_HERE",
            yRange: { min: 0, max: 10 },
          },
        }),
      ],
    });

    expect(store.getState().getTrack("signal")).toMatchObject({
      config: { yRange: { min: 0, max: 10 } },
    });

    expect(
      store.getState().updateTrack("signal", { config: { yRange: { min: 5, max: 20 } } }),
    ).toEqual({ ok: true });
    expect(store.getState().getTrack("signal")).toMatchObject({
      config: { yRange: { min: 5, max: 20 } },
    });

    expect(
      store.getState().updateTrack("signal", { config: { yRange: { min: 20, max: 5 } } }),
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/bigwig instance is invalid/),
    });
    expect(store.getState().getTrack("signal")).toMatchObject({
      config: { yRange: { min: 5, max: 20 } },
    });
  });

  it("exposes updateTrack as the only existing-track update API", () => {
    const store = createTrackStore({
      modules: [bigWigModule, bigBedModule],
      tracks: [bigWigTrack()],
    });

    expect(store.getState().updateTrack).toBeTypeOf("function");
    expect(store.getState()).not.toHaveProperty("updateBase");
    expect(store.getState()).not.toHaveProperty("updateConfig");
  });
});
