import { describe, expect, it } from "vitest";
import {
  formatGenomicInterval,
  formatOptionalBedValue,
  formatSignalValue,
} from "../../src/tooltips/trackTooltipFormatters";

describe("track tooltip formatters", () => {
  it("formats finite signal values with fixed grouping and handles all non-finite values", () => {
    expect(formatSignalValue(1234.5678)).toBe("1,234.57");
    expect(formatSignalValue(2)).toBe("2.00");
    expect(formatSignalValue(2.2)).toBe("2.20");
    expect(formatSignalValue(2.234)).toBe("2.23");
    expect(formatSignalValue(null)).toBe("No data");
    expect(formatSignalValue(undefined)).toBe("No data");
    expect(formatSignalValue(Number.NaN)).toBe("No data");
    expect(formatSignalValue(Number.POSITIVE_INFINITY)).toBe("No data");
  });

  it("limits optional numeric values to two decimal places", () => {
    expect(formatOptionalBedValue(2)).toBe("2");
    expect(formatOptionalBedValue(2.2)).toBe("2.2");
    expect(formatOptionalBedValue(2.234)).toBe("2.23");
    expect(formatOptionalBedValue("named score")).toBe("named score");
    expect(formatOptionalBedValue(".")).toBeUndefined();
    expect(formatOptionalBedValue("   ")).toBeUndefined();
    expect(formatOptionalBedValue(Number.NaN)).toBeUndefined();
  });

  it("uses one deterministic genomic interval convention", () => {
    expect(formatGenomicInterval(1234, 56789, "chr2")).toBe("chr2:1,234–56,789");
    expect(formatGenomicInterval(1234, 56789)).toBe("1,234–56,789");
  });
});
