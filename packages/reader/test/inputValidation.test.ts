import { afterEach, describe, expect, it, vi } from "vitest";
import { validateHttpUrl, validateRegion } from "../src/internal/inputValidation";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("input validation", () => {
  it("accepts only absolute HTTP(S) URLs synchronously without fetching", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(validateHttpUrl("http://example.test/file.bb")).toBe("http://example.test/file.bb");
    expect(validateHttpUrl("https://example.test/a/../file.bb")).toBe(
      "https://example.test/file.bb",
    );

    for (const invalidUrl of ["not a URL", "/relative.bb", "ftp://example.test/file.bb"]) {
      expect(() => validateHttpUrl(invalidUrl)).toThrow(TypeError);
    }
    expect(() => validateHttpUrl(42 as unknown as string)).toThrow(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("classifies invalid BigBed coordinates according to the regional-read contract", () => {
    for (const [start, end] of [
      ["0", 1],
      [0, Number.NaN],
      [Number.POSITIVE_INFINITY, 10],
      [0.5, 10],
    ]) {
      expect(() => validateRegion({ chromosome: "chr1", start, end } as never)).toThrow(TypeError);
    }

    for (const [start, end] of [
      [-1, 1],
      [0, -1],
      [1, 1],
      [2, 1],
    ]) {
      expect(() => validateRegion({ chromosome: "chr1", start, end })).toThrow(RangeError);
    }

    expect(() => validateRegion({ chromosome: "chr1", start: 0, end: 1 })).not.toThrow();
  });
});
