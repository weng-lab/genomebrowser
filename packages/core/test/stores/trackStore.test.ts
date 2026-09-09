import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

const yRangeSchema = z
  .object({ min: z.number(), max: z.number() })
  .refine((range) => range.min < range.max);
const signalModule = defineTrackModule({
  type: "signal",
  defaults: { height: 80, color: "#2266aa" },
  configSchema: z.object({
    url: z.string().min(1),
    yRange: yRangeSchema.optional(),
    clampIndicatorColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i, "Expected a six-digit hexadecimal color")
      .default("#ff0000"),
  }),
  fetch: async () => null,
  render: { full: () => null, dense: () => null },
});
const intervalModule = defineTrackModule({
  type: "interval",
  configSchema: z.object({ url: z.string().min(1) }),
  fetch: async () => null,
  render: { full: () => null },
});

describe("createTrackStore", () => {
  function signalTrack(id = "signal") {
    return signalModule.create({
      id,
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    });
  }

  it("pins tracks from any module in configured order and snapshots duplicate IDs", () => {
    const ids = ["interval", "b", "interval"];
    const store = createTrackStore({
      modules: [signalModule, intervalModule],
      tracks: [
        signalTrack("a"),
        signalTrack("b"),
        intervalModule.create({
          id: "interval",
          title: "Intervals",
          config: { url: "YOUR_URL_HERE" },
        }),
      ],
      pinnedTrackIds: ids,
    });
    ids.reverse();
    expect(store.getState().pinnedTrackIds).toEqual(["interval", "b"]);
    expect(store.getState().order).toEqual(["interval", "b", "a"]);
    expect(store.getState().tracks.map((track) => track.base.id)).toEqual(store.getState().order);
  });

  it("reserves missing pins and maintains their order through every membership mutation", () => {
    const store = createTrackStore({
      modules: [signalModule],
      tracks: [signalTrack("a")],
      pinnedTrackIds: ["first", "second"],
    });
    store.getState().addTrack(signalTrack("second"));
    store.getState().addTrack(signalTrack("first"));
    store.getState().addTrack(signalTrack("b"), 0);
    expect(store.getState().order).toEqual(["first", "second", "b", "a"]);

    store.getState().removeTrack("first");
    expect(store.getState().order).toEqual(["second", "b", "a"]);
    expect(store.getState().pinnedTrackIds).toEqual(["first", "second"]);
    store.getState().applyTrackChanges({
      remove: ["second"],
      add: [signalTrack("first"), signalTrack("second")],
    });
    expect(store.getState().order).toEqual(["first", "second", "b", "a"]);
    store.getState().setTracks([signalTrack("a"), signalTrack("second"), signalTrack("first")]);
    expect(store.getState().order).toEqual(["first", "second", "a"]);
    store.getState().updateTrack("first", { base: { height: 120 } });
    expect(store.getState().order).toEqual(["first", "second", "a"]);
    expect(store.getState().tracks.map((track) => track.base.id)).toEqual(store.getState().order);
  });

  it("normalizes requested reorders around pins and rejects invalid orders atomically", () => {
    const store = createTrackStore({
      modules: [signalModule],
      tracks: ["a", "b", "c", "d"].map(signalTrack),
      pinnedTrackIds: ["b", "a"],
    });
    expect(store.getState().reorderTracks(["d", "a", "c", "b"])).toEqual({ ok: true });
    expect(store.getState().order).toEqual(["b", "a", "d", "c"]);
    const accepted = store.getState();
    expect(store.getState().reorderTracks(["d", "a", "b", "b"]).ok).toBe(false);
    expect(store.getState()).toBe(accepted);
  });

  it("changes and clears pins atomically without restoring an old unpinned order", () => {
    const store = createTrackStore({
      modules: [signalModule],
      tracks: ["a", "b", "c"].map(signalTrack),
    });
    const subscriber = vi.fn();
    store.subscribe(subscriber);
    const ids = ["c", "b", "c"];
    expect(store.getState().setPinnedTrackIds(ids)).toEqual({ ok: true });
    ids.push("a");
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(store.getState().pinnedTrackIds).toEqual(["c", "b"]);
    expect(store.getState().order).toEqual(["c", "b", "a"]);
    store.getState().setPinnedTrackIds(["b"]);
    expect(store.getState().order).toEqual(["b", "c", "a"]);
    store.getState().setPinnedTrackIds([]);
    expect(store.getState().order).toEqual(["b", "c", "a"]);
    store.getState().reorderTracks(["a", "b", "c"]);
    expect(store.getState().order).toEqual(["a", "b", "c"]);
    expect(createTrackStore({ modules: [signalModule] }).getState().pinnedTrackIds).toEqual([]);
  });

  it("validates initial tracks with their modules", () => {
    const track = signalTrack();
    const store = createTrackStore({ modules: [signalModule], tracks: [track] });

    expect(store.getState().tracks).toEqual([track]);
  });

  it("rejects module-invalid initial tracks", () => {
    expect(() =>
      createTrackStore({
        modules: [signalModule],
        tracks: [
          {
            type: "signal",
            base: {
              id: "signal",
              title: "Signal",
              display: "full",
              height: 80,
              color: "#000000",
            },
            config: {},
            source: "user",
          },
        ],
      }),
    ).toThrow(/signal instance is invalid/);
  });

  it("rejects unknown track types", () => {
    expect(() =>
      createTrackStore({
        modules: [signalModule],
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
            source: "user",
          },
        ],
      }),
    ).toThrow(/No track module registered/);
  });

  it("rejects duplicate track ids after module validation", () => {
    expect(() =>
      createTrackStore({ modules: [signalModule], tracks: [signalTrack(), signalTrack()] }),
    ).toThrow(/Duplicate track id/);
  });

  it("validates setTracks replacements", () => {
    const store = createTrackStore({ modules: [signalModule], tracks: [signalTrack()] });
    const nextTrack = signalTrack("next");

    expect(store.getState().setTracks([nextTrack])).toEqual({ ok: true });
    expect(store.getState().tracks).toEqual([nextTrack]);

    expect(
      store.getState().setTracks([
        {
          type: "signal",
          base: {
            id: "bad",
            title: "Bad",
            display: "full",
            height: 80,
            color: "#000000",
          },
          config: {},
          source: "user",
        },
      ]),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/signal instance is invalid/) });
    expect(store.getState().tracks).toEqual([nextTrack]);
  });

  it("validates added tracks", () => {
    const store = createTrackStore({ modules: [signalModule], tracks: [] });
    const track = signalTrack();

    expect(store.getState().addTrack(track)).toEqual({ ok: true });
    expect(store.getState().tracks).toEqual([track]);

    expect(store.getState().addTrack(track)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Duplicate track id/),
    });
    expect(
      store.getState().addTrack({
        type: "signal",
        base: {
          id: "bad",
          title: "Bad",
          display: "full",
          height: 80,
          color: "#000000",
        },
        config: {},
        source: "user",
      }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/signal instance is invalid/) });
  });

  it("applies bulk adds and removes in one update", () => {
    const store = createTrackStore({ modules: [signalModule], tracks: [signalTrack()] });
    const added = signalTrack("added");

    expect(store.getState().applyTrackChanges({ add: [added], remove: ["signal"] })).toEqual({
      ok: true,
    });
    expect(store.getState().tracks).toEqual([added]);
    expect(store.getState().order).toEqual(["added"]);
  });

  it("allows replacing a track id within one bulk change", () => {
    const store = createTrackStore({ modules: [signalModule], tracks: [signalTrack()] });
    const replacement = signalTrack("signal");

    expect(store.getState().applyTrackChanges({ add: [replacement], remove: ["signal"] })).toEqual({
      ok: true,
    });
    expect(store.getState().tracks).toEqual([replacement]);
  });

  it("rejects bulk changes atomically", () => {
    const initial = signalTrack();
    const store = createTrackStore({ modules: [signalModule], tracks: [initial] });

    expect(
      store.getState().applyTrackChanges({ add: [signalTrack("next")], remove: ["missing"] }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/No track found/) });
    expect(store.getState().tracks).toEqual([initial]);

    expect(
      store.getState().applyTrackChanges({
        add: [
          {
            type: "signal",
            base: {
              id: "bad",
              title: "Bad",
              display: "full",
              height: 80,
              color: "#000000",
            },
            config: {},
            source: "user",
          },
        ],
        remove: ["signal"],
      }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/signal instance is invalid/) });
    expect(store.getState().tracks).toEqual([initial]);

    expect(store.getState().applyTrackChanges({ add: [signalTrack()] })).toMatchObject({
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
    const initial = signalModule.create(
      {
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      },
      { onClick, onHover, onLeave },
    );
    const store = createTrackStore({ modules: [signalModule], tracks: [initial] });

    expect(store.getState().getTrack("signal")).toMatchObject({
      interaction: {
        onClick,
        onHover,
        onLeave,
      },
    });

    const added = signalModule.create(
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
    const store = createTrackStore({ modules: [signalModule], tracks: [] });

    expect(
      store.getState().addTrack({
        type: "signal",
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
    ).toMatchObject({ ok: false, error: expect.stringMatching(/signal instance is invalid/) });

    store.getState().addTrack(signalTrack());
    expect(
      store.getState().updateTrack("signal", { config: { tooltip: Tooltip } } as never),
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/signal instance is invalid/),
    });
  });

  it("rejects invalid interaction updates", () => {
    const store = createTrackStore({ modules: [signalModule], tracks: [signalTrack()] });
    const initialTrack = store.getState().getTrack("signal");

    expect(
      store
        .getState()
        .updateTrack("signal", { interaction: { onClick: "not a function" as never } }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/signal instance is invalid/) });
    expect(store.getState().getTrack("signal")).toBe(initialTrack);
  });

  it("validates base, config, and interaction patches atomically while preserving identity", () => {
    const onHover = () => undefined;
    const nextClick = () => undefined;
    const configuredTrack = signalModule.create(
      {
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      },
      { onHover },
    );
    const unchangedTrack = signalTrack("unchanged");
    const store = createTrackStore({
      modules: [signalModule],
      tracks: [configuredTrack, unchangedTrack],
    });
    const validate = vi.spyOn(signalModule, "validate");
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
      type: "signal",
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
      error: expect.stringMatching(/signal instance is invalid/),
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

  it("persists signal yRange from initial config and external updates", () => {
    const store = createTrackStore({
      modules: [signalModule],
      tracks: [
        signalModule.create({
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
      error: expect.stringMatching(/signal instance is invalid/),
    });
    expect(store.getState().getTrack("signal")).toMatchObject({
      config: { yRange: { min: 5, max: 20 } },
    });
  });

  it("exposes updateTrack as the only existing-track update API", () => {
    const store = createTrackStore({
      modules: [signalModule, intervalModule],
      tracks: [signalTrack()],
    });

    expect(store.getState().updateTrack).toBeTypeOf("function");
    expect(store.getState()).not.toHaveProperty("updateBase");
    expect(store.getState()).not.toHaveProperty("updateConfig");
  });
});
