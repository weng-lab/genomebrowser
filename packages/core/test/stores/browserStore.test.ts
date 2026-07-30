import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createBrowserStore,
  hg38,
  type AssemblyDefinition,
  type BrowserStoreInput,
  type GenomicRegion,
} from "../../src/lib";

const testAssembly: AssemblyDefinition = {
  id: "test",
  chromosomes: { chr1: 100, Chr1: 50, chr2: 200 },
};

function createTestStore(region: GenomicRegion = { chromosome: "chr1", start: 20, end: 40 }) {
  return createBrowserStore({ assembly: testAssembly, region });
}

describe("createBrowserStore", () => {
  it("requires object regions and an assembly and exposes no assembly setter", () => {
    expectTypeOf<BrowserStoreInput["assembly"]>().toEqualTypeOf<AssemblyDefinition>();
    expectTypeOf<BrowserStoreInput["region"]>().toEqualTypeOf<GenomicRegion>();

    const store = createBrowserStore({
      assembly: hg38,
      region: { chromosome: "chr1", start: 100, end: 200 },
    });

    expect(store.getState().assembly).toEqual(hg38);
    expect(store.getState().assembly).not.toBe(hg38);
    expect(store.getState()).not.toHaveProperty("setAssembly");
  });

  it("uses custom assembly bounds even when its id matches a preset", () => {
    const store = createBrowserStore({
      assembly: { id: "hg38", chromosomes: { custom: 25 } },
      region: { chromosome: "custom", start: -5, end: 20 },
    });

    expect(store.getState().assembly).toEqual({ id: "hg38", chromosomes: { custom: 25 } });
    expect(store.getState().region).toEqual({ chromosome: "custom", start: 0, end: 20 });
  });

  it("snapshots and freezes caller-owned assembly configuration", () => {
    const chromosomes: Record<string, number> = { chr1: 100 };
    const assembly = { id: "mutable", chromosomes };
    const store = createBrowserStore({
      assembly,
      region: { chromosome: "chr1", start: 80, end: 90 },
    });

    chromosomes.chr1 = 1000;
    chromosomes.chr2 = 200;
    assembly.id = "changed";

    expect(store.getState().assembly).toEqual({ id: "mutable", chromosomes: { chr1: 100 } });
    expect(Object.isFrozen(store.getState().assembly)).toBe(true);
    expect(Object.isFrozen(store.getState().assembly.chromosomes)).toBe(true);
    expect(store.getState().setRegion({ chromosome: "chr1", start: 90, end: 110 })).toEqual({
      ok: true,
      region: { chromosome: "chr1", start: 90, end: 100 },
      clamped: true,
    });
  });

  it.each([
    [
      "a missing assembly",
      { region: { chromosome: "chr1", start: 0, end: 10 } },
      /Invalid assembly definition: expected an object/,
    ],
    [
      "an invalid assembly",
      {
        assembly: { id: "", chromosomes: { chr1: 100 } },
        region: { chromosome: "chr1", start: 0, end: 10 },
      },
      /id must be a non-empty string/,
    ],
    [
      "an unknown initial chromosome",
      { assembly: testAssembly, region: { chromosome: "unknown", start: 0, end: 10 } },
      /initial region is invalid \(UNKNOWN_CHROMOSOME\)/,
    ],
    [
      "a string initial region",
      { assembly: testAssembly, region: "chr1:0-10" },
      /initial region is invalid \(INVALID_REGION\)/,
    ],
    [
      "an invalid initial track width",
      {
        assembly: testAssembly,
        region: { chromosome: "chr1", start: 0, end: 10 },
        trackWidth: Number.NaN,
      },
      /Browser store input is invalid/,
    ],
  ])("throws synchronously for %s", (_name, input, error) => {
    expect(() => createBrowserStore(input as BrowserStoreInput)).toThrow(error);
  });

  it("commits ordinary and clamped setRegion results", () => {
    const store = createTestStore();

    expect(store.getState().setRegion({ chromosome: "chr2", start: 50, end: 80 })).toEqual({
      ok: true,
      region: { chromosome: "chr2", start: 50, end: 80 },
      clamped: false,
    });
    expect(store.getState().region).toEqual({ chromosome: "chr2", start: 50, end: 80 });

    expect(store.getState().setRegion({ chromosome: "chr1", start: -10, end: 120 })).toEqual({
      ok: true,
      region: { chromosome: "chr1", start: 0, end: 100 },
      clamped: true,
    });
    expect(store.getState().region).toEqual({ chromosome: "chr1", start: 0, end: 100 });
  });

  it("uses exact case-sensitive chromosome lookup", () => {
    const store = createTestStore();

    expect(store.getState().setRegion({ chromosome: "Chr1", start: 40, end: 60 })).toEqual({
      ok: true,
      region: { chromosome: "Chr1", start: 40, end: 50 },
      clamped: true,
    });
    expect(store.getState().setRegion({ chromosome: "CHR1", start: 0, end: 10 })).toMatchObject({
      ok: false,
      code: "UNKNOWN_CHROMOSOME",
      error: expect.stringMatching(/CHR1.*assembly "test"/),
    });
  });

  it.each([
    ["unknown chromosome", { chromosome: "unknown", start: 0, end: 10 }, "UNKNOWN_CHROMOSOME"],
    ["outside chromosome", { chromosome: "chr1", start: 100, end: 110 }, "OUTSIDE_CHROMOSOME"],
    ["fractional coordinate", { chromosome: "chr1", start: 1.5, end: 10 }, "INVALID_COORDINATE"],
    ["reversed region", { chromosome: "chr1", start: 20, end: 10 }, "REVERSED_REGION"],
    ["zero-width region", { chromosome: "chr1", start: 10, end: 10 }, "ZERO_WIDTH_REGION"],
  ] as const)("rejects a setRegion with %s without changing state", (_name, region, code) => {
    const store = createTestStore();
    const before = store.getState();

    expect(store.getState().setRegion(region)).toMatchObject({
      ok: false,
      code,
      error: expect.any(String),
    });
    expect(store.getState()).toBe(before);
    expect(store.getState().region).toEqual({ chromosome: "chr1", start: 20, end: 40 });
  });

  it("returns a result rather than throwing for malformed runtime region input", () => {
    const store = createTestStore();
    const before = store.getState();

    expect(store.getState().setRegion("chr1:0-10" as never)).toEqual({
      ok: false,
      code: "INVALID_REGION",
      error: "Region must be an object with chromosome, start, and end.",
    });
    expect(store.getState()).toBe(before);
  });

  it("zooms through the normalized commit boundary and returns the committed region", () => {
    const store = createTestStore();

    expect(store.getState().zoom(0.5)).toEqual({
      ok: true,
      region: { chromosome: "chr1", start: 25, end: 35 },
      clamped: false,
    });
    expect(store.getState().region).toEqual({ chromosome: "chr1", start: 25, end: 35 });
  });

  it.each([
    ["lower", { chromosome: "chr1", start: 0, end: 20 }, { chromosome: "chr1", start: 0, end: 30 }],
    [
      "upper",
      { chromosome: "chr1", start: 80, end: 100 },
      { chromosome: "chr1", start: 70, end: 100 },
    ],
  ] as const)("clamps zoom at the %s chromosome boundary", (_name, initialRegion, region) => {
    const store = createTestStore(initialRegion);

    expect(store.getState().zoom(2)).toEqual({ ok: true, region, clamped: true });
    expect(store.getState().region).toEqual(region);
  });

  it("can zoom a one-base region at the upper chromosome boundary", () => {
    const store = createTestStore({ chromosome: "chr1", start: 99, end: 100 });

    expect(store.getState().zoom(0.5)).toEqual({
      ok: true,
      region: { chromosome: "chr1", start: 99, end: 100 },
      clamped: false,
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid zoom factor %s atomically",
    (factor) => {
      const store = createTestStore();
      const before = store.getState();

      expect(store.getState().zoom(factor)).toEqual({
        ok: false,
        code: "INVALID_ZOOM_FACTOR",
        error: "Zoom factor must be a finite number greater than 0.",
      });
      expect(store.getState()).toBe(before);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 100, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid zoom center %s atomically",
    (center) => {
      const store = createTestStore();
      const before = store.getState();

      expect(store.getState().zoom(0.5, center)).toMatchObject({
        ok: false,
        code: "INVALID_ZOOM_CENTER",
        error: expect.stringMatching(/safe integer.*bounds \[0, 100\)/),
      });
      expect(store.getState()).toBe(before);
    },
  );

  it("preserves state when a finite zoom factor produces an invalid candidate region", () => {
    const store = createTestStore();
    const before = store.getState();

    expect(store.getState().zoom(Number.MAX_VALUE)).toMatchObject({
      ok: false,
      code: "INVALID_COORDINATE",
      error: expect.any(String),
    });
    expect(store.getState()).toBe(before);
  });

  it("validates runtime track widths and returns the committed dimension", () => {
    const store = createTestStore();

    expect(store.getState().setTrackWidth(250.5)).toEqual({ ok: true, trackWidth: 250.5 });
    expect(store.getState().trackWidth).toBe(250.5);

    for (const trackWidth of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const before = store.getState();
      expect(store.getState().setTrackWidth(trackWidth)).toEqual({
        ok: false,
        code: "INVALID_TRACK_WIDTH",
        error: "Track width must be a finite number greater than 0.",
      });
      expect(store.getState()).toBe(before);
      expect(store.getState().trackWidth).toBe(250.5);
    }
  });

  it("stores, adds, deduplicates, and removes highlights", () => {
    const store = createBrowserStore({
      assembly: testAssembly,
      region: { chromosome: "chr1", start: 20, end: 40 },
      highlights: [
        {
          id: "enhancer",
          region: { chromosome: "chr1", start: 20, end: 30 },
          color: "#ff0000",
        },
      ],
    });

    store.getState().addHighlight({
      id: "target",
      region: { start: 30, end: 35 },
      color: "#00ff00",
    });
    store.getState().addHighlight({
      id: "target",
      region: { start: 35, end: 40 },
      color: "#0000ff",
    });
    store.getState().removeHighlight("enhancer");

    expect(store.getState().highlights).toEqual([
      { id: "target", region: { start: 30, end: 35 }, color: "#00ff00" },
    ]);
  });

  it("still rejects invalid highlight regions", () => {
    expect(() =>
      createBrowserStore({
        assembly: testAssembly,
        region: { chromosome: "chr1", start: 20, end: 40 },
        highlights: [
          {
            id: "bad",
            region: { chromosome: "chr1", start: 40, end: 20 },
            color: "#ff0000",
          },
        ],
      }),
    ).toThrow(/Browser store input is invalid/);

    const store = createTestStore();
    expect(() =>
      store.getState().addHighlight({
        id: "bad",
        region: { start: 40, end: 20 },
        color: "#ff0000",
      }),
    ).toThrow(/Highlight is invalid/);
  });
});
