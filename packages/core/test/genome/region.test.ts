import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createAssemblyDefinition,
  normalizeRegion,
  parseRegion,
  type GenomicRegion,
  type RegionResult,
} from "../../src/lib";

describe("parseRegion", () => {
  it("exposes a string-only public parsing facade", () => {
    expectTypeOf(parseRegion).parameter(0).toEqualTypeOf<string>();
    expectTypeOf<ReturnType<typeof parseRegion>>().toEqualTypeOf<GenomicRegion>();
    expect(() => parseRegion({ chromosome: "chr1", start: 1, end: 2 } as never)).toThrow(
      /expected a string/,
    );
  });

  it.each([
    ["colon-and-dash", "chr12:53372922-53423700", "chr12", 53372922, 53423700],
    ["colon-and-dash with commas", "chr12:53,372,922-53,423,700", "chr12", 53372922, 53423700],
    ["tab-delimited", "chr12\t53372922\t53423700", "chr12", 53372922, 53423700],
    ["space-delimited", "chr12 53372922 53423700", "chr12", 53372922, 53423700],
    ["varied whitespace", "chr12 \t 53,372,922   53,423,700", "chr12", 53372922, 53423700],
    ["surrounding whitespace", " \n\tchr12 100 200\t ", "chr12", 100, 200],
    ["punctuation whitespace", " chr12 \t:  1,000 \n-\t2,000 ", "chr12", 1000, 2000],
    ["chromosome case", "ChrX:10-20", "ChrX", 10, 20],
    ["signed coordinates", "chr1:-10-20", "chr1", -10, 20],
    ["signed whitespace fields", "chr1 -10 +20", "chr1", -10, 20],
  ])("parses %s input", (_name, input, chromosome, start, end) => {
    expect(parseRegion(input)).toEqual({ chromosome, start, end });
  });

  it.each([
    ["empty input", ""],
    ["missing end", "chr1:100-"],
    ["missing separator", "chr1:100"],
    ["too few whitespace fields", "chr1 100"],
    ["too many whitespace fields", "chr1 100 200 extra"],
    ["dash syntax mixed with fields", "chr1 100-200"],
    ["colon syntax mixed with fields", "chr1:100 200"],
    ["spaced punctuation mixed with fields", "chr1 : 100 200"],
    ["extra locus coordinate", "chr1:100-200 300"],
    ["multiple colons", "chr1:100:200-300"],
    ["decimal coordinate", "chr1:1.5-2"],
    ["malformed thousands separator", "chr1:1,00-2,000"],
    ["repeated comma", "chr1 1,,000 2,000"],
    ["whitespace in locus chromosome", "chr 1:100-200"],
  ])("rejects structurally malformed or ambiguous %s", (_name, input) => {
    expect(() => parseRegion(input)).toThrow(/Invalid region string: expected/);
  });

  it("defers assembly and interval validity to normalization", () => {
    expect(parseRegion("Unknown:200-100")).toEqual({
      chromosome: "Unknown",
      start: 200,
      end: 100,
    });
    expect(parseRegion(`chr1:0-${"9".repeat(400)}`)).toEqual({
      chromosome: "chr1",
      start: 0,
      end: Number.POSITIVE_INFINITY,
    });
  });
});

describe("normalizeRegion", () => {
  const assembly = createAssemblyDefinition({
    id: "test",
    chromosomes: { chr1: 100, Chr1: 50 },
  });

  it.each([
    ["interior interval", { chromosome: "chr1", start: 10, end: 20 }, 10, 20, false],
    ["exact chromosome bounds", { chromosome: "chr1", start: 0, end: 100 }, 0, 100, false],
    ["first base", { chromosome: "chr1", start: 0, end: 1 }, 0, 1, false],
    ["lower partial overlap", { chromosome: "chr1", start: -10, end: 20 }, 0, 20, true],
    ["upper partial overlap", { chromosome: "chr1", start: 90, end: 120 }, 90, 100, true],
    ["both boundaries", { chromosome: "chr1", start: -10, end: 120 }, 0, 100, true],
  ] as const)("normalizes %s", (_name, region, start, end, clamped) => {
    const result = normalizeRegion(region, assembly);

    expect(result).toEqual({
      ok: true,
      region: { chromosome: "chr1", start, end },
      clamped,
    });
    expectTypeOf(result).toEqualTypeOf<RegionResult>();
  });

  it("uses exact, case-sensitive chromosome lookup", () => {
    expect(normalizeRegion({ chromosome: "Chr1", start: 0, end: 50 }, assembly)).toEqual({
      ok: true,
      region: { chromosome: "Chr1", start: 0, end: 50 },
      clamped: false,
    });
    expect(normalizeRegion({ chromosome: "CHR1", start: 0, end: 10 }, assembly)).toMatchObject({
      ok: false,
      code: "UNKNOWN_CHROMOSOME",
      error: expect.stringMatching(/CHR1.*assembly "test"/),
    });
  });

  it.each([
    ["invalid start", { chromosome: "unknown", start: Number.NaN, end: 10 }, "INVALID_COORDINATE"],
    [
      "invalid end",
      { chromosome: "unknown", start: 0, end: Number.MAX_SAFE_INTEGER + 1 },
      "INVALID_COORDINATE",
    ],
    ["reversed interval", { chromosome: "unknown", start: 20, end: 10 }, "REVERSED_REGION"],
    ["zero-width interval", { chromosome: "unknown", start: 10, end: 10 }, "ZERO_WIDTH_REGION"],
  ] as const)("reports %s before unknown chromosome lookup", (_name, region, code) => {
    expect(normalizeRegion(region, assembly)).toMatchObject({ ok: false, code });
  });

  it.each([
    [
      "unknown chromosome",
      { chromosome: "chr2", start: 0, end: 10 },
      "UNKNOWN_CHROMOSOME",
      /chr2.*test/,
    ],
    [
      "empty chromosome",
      { chromosome: "", start: 0, end: 10 },
      "INVALID_REGION",
      /non-empty string/,
    ],
    [
      "missing start",
      { chromosome: "chr1", end: 10 },
      "INVALID_COORDINATE",
      /start.*finite safe integer/,
    ],
    [
      "NaN start",
      { chromosome: "chr1", start: Number.NaN, end: 10 },
      "INVALID_COORDINATE",
      /start.*finite safe integer/,
    ],
    [
      "infinite start",
      { chromosome: "chr1", start: Number.POSITIVE_INFINITY, end: 10 },
      "INVALID_COORDINATE",
      /start.*finite safe integer/,
    ],
    [
      "negative infinite end",
      { chromosome: "chr1", start: 0, end: Number.NEGATIVE_INFINITY },
      "INVALID_COORDINATE",
      /end.*finite safe integer/,
    ],
    [
      "fractional start",
      { chromosome: "chr1", start: 1.5, end: 10 },
      "INVALID_COORDINATE",
      /start.*finite safe integer/,
    ],
    [
      "fractional end",
      { chromosome: "chr1", start: 1, end: 10.5 },
      "INVALID_COORDINATE",
      /end.*finite safe integer/,
    ],
    [
      "unsafe start",
      { chromosome: "chr1", start: Number.MAX_SAFE_INTEGER + 1, end: Number.MAX_SAFE_INTEGER + 2 },
      "INVALID_COORDINATE",
      /start.*finite safe integer/,
    ],
    [
      "unsafe end",
      { chromosome: "chr1", start: 1, end: Number.MAX_SAFE_INTEGER + 1 },
      "INVALID_COORDINATE",
      /end.*finite safe integer/,
    ],
    [
      "reversed interval",
      { chromosome: "chr1", start: 20, end: 10 },
      "REVERSED_REGION",
      /start \(20\).*end \(10\)/,
    ],
    [
      "zero-width interval",
      { chromosome: "chr1", start: 10, end: 10 },
      "ZERO_WIDTH_REGION",
      /non-zero width/,
    ],
    [
      "touching before chromosome",
      { chromosome: "chr1", start: -10, end: 0 },
      "OUTSIDE_CHROMOSOME",
      /bounds \[0, 100\)/,
    ],
    [
      "entirely before chromosome",
      { chromosome: "chr1", start: -20, end: -10 },
      "OUTSIDE_CHROMOSOME",
      /bounds \[0, 100\)/,
    ],
    [
      "touching after chromosome",
      { chromosome: "chr1", start: 100, end: 110 },
      "OUTSIDE_CHROMOSOME",
      /bounds \[0, 100\)/,
    ],
    [
      "entirely after chromosome",
      { chromosome: "chr1", start: 110, end: 120 },
      "OUTSIDE_CHROMOSOME",
      /bounds \[0, 100\)/,
    ],
  ] as const)("rejects %s with an actionable coded failure", (_name, region, code, error) => {
    const result = normalizeRegion(region as GenomicRegion, assembly);

    expect(result).toMatchObject({ ok: false, code, error: expect.stringMatching(error) });
  });

  it.each([
    ["null", null],
    ["array", []],
    ["string", "chr1:0-10"],
  ])("rejects a malformed %s region object", (_name, region) => {
    expect(normalizeRegion(region as unknown as GenomicRegion, assembly)).toMatchObject({
      ok: false,
      code: "INVALID_REGION",
      error: expect.stringMatching(/must be an object/),
    });
  });
});
