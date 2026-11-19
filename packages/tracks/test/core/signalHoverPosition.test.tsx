// @vitest-environment jsdom

import type { BigWigValueRecord } from "@weng-lab/genomic-reader";
import { expect, it } from "vitest";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { methylCModule } from "@weng-lab/genomebrowser-tracks/methylc";
import { mountTrack } from "../mountTrack";
import { hoverLine, hoverSignal } from "./signalHover";

// Four bases across 40 units: base 0 covers x [0, 10), base 1 covers [10, 20).
const region = { chromosome: "chr1", start: 0, end: 4 };
const width = 40;
const records: BigWigValueRecord[] = [1, 2, 3, 4].map((value, start) => ({
  kind: "value",
  chromosome: "chr1",
  start,
  end: start + 1,
  value,
}));

it("reports the BigWig base under the pointer near its right edge", async () => {
  const view = await mountTrack({
    module: bigWigModule,
    track: {
      base: { id: "signal", title: "Signal", color: "#2266aa", height: 40 },
      config: {
        url: "YOUR_URL_HERE",
        fillWithZero: false,
        showClampIndicators: true,
        clampIndicatorColor: "#ff0000",
      },
    },
    data: records,
    region,
    width,
  });

  expect(await hoverSignal(view, 9.6, width)).toBe("Signal1.00");
  expect(view.tooltipItem).toMatchObject({ x: 9, max: 1 });
  expect(hoverLine(view)).toBe("9");
});

it("reports the MethylC base under the pointer near its right edge", async () => {
  const view = await mountTrack({
    module: methylCModule,
    track: {
      base: { id: "methylc", title: "MethylC", height: 80 },
      config: { urls: urls("YOUR_URL_HERE") },
    },
    data: [records, [], [], [], [], [], [], []],
    region,
    width,
  });

  expect(await hoverSignal(view, 9.6, width)).toBe(
    "Plus CpG1.00Plus CHGNo dataPlus CHHNo dataPlus depthNo data" +
      "Minus CpGNo dataMinus CHGNo dataMinus CHHNo dataMinus depthNo data",
  );
  const { tooltipValues } = view.tooltipItem as { tooltipValues: unknown[] };
  expect(tooltipValues[0]).toMatchObject({ x: 9, max: 1 });
  expect(hoverLine(view)).toBe("9");
});

function urls(url: string) {
  const strand = { cpg: { url }, chg: { url }, chh: { url }, depth: { url } };
  return { plusStrand: strand, minusStrand: strand };
}
