import { describe, expect, expectTypeOf, it } from "vitest";
import {
  formatGenomicInterval,
  formatOptionalBedValue,
  formatSignalValue,
  TrackTooltip,
  type TrackTooltipProps,
  type TrackTooltipRow,
} from "@weng-lab/genomebrowser-tracks/shared";

describe("public track tooltip authoring API", () => {
  it("exports the shared tooltip component and its package-owned types", () => {
    expect(TrackTooltip).toBeTypeOf("function");
    expectTypeOf(TrackTooltip).parameter(0).toEqualTypeOf<TrackTooltipProps>();
    expectTypeOf<TrackTooltipProps>().toEqualTypeOf<{
      title?: string;
      titleColor?: string;
      rows: readonly TrackTooltipRow[];
    }>();
    expectTypeOf<TrackTooltipRow>().toEqualTypeOf<{
      label: string;
      value: string;
      color?: string;
    }>();
  });

  it("exports the reusable formatter helpers with their public signatures", () => {
    expectTypeOf(formatSignalValue).toEqualTypeOf<(value: number | null | undefined) => string>();
    expectTypeOf(formatOptionalBedValue).toEqualTypeOf<
      (value: number | string | undefined) => string | undefined
    >();
    expectTypeOf(formatGenomicInterval).toEqualTypeOf<
      (start: number, end: number, chromosome?: string) => string
    >();

    expect(formatSignalValue(null)).toBe("No data");
    expect(formatOptionalBedValue(".")).toBeUndefined();
    expect(formatGenomicInterval(1_000, 2_000, "chr1")).toBe("chr1:1,000–2,000");
  });
});
