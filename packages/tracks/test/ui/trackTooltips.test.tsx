// @vitest-environment jsdom

import type { TrackRuntimeContext } from "@weng-lab/genomebrowser";
import type { CaveConfig } from "@weng-lab/genomebrowser-tracks/cave";
import type {
  MethylCConfig,
  MethylCShowRows,
  MethylCTooltipItem,
} from "@weng-lab/genomebrowser-tracks/methylc";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BigBedTooltip } from "../../src/bigbed/tooltip";
import { BigWigTooltip } from "../../src/bigwig/tooltip";
import { BulkBedTooltip } from "../../src/bulkbed/tooltip";
import { CaveTooltip } from "../../src/cave/tooltip";
import { MethylCTooltip } from "../../src/methylc/tooltip";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const methylCConfig: MethylCConfig = {
  urls: {
    plusStrand: {
      cpg: { url: "PLUS_CPG_URL" },
      chg: { url: "" },
      chh: { url: "PLUS_CHH_URL" },
      depth: { url: "" },
    },
    minusStrand: {
      cpg: { url: "" },
      chg: { url: "" },
      chh: { url: "" },
      depth: { url: "MINUS_DEPTH_URL" },
    },
  },
  colors: {
    cpg: "#648bd8",
    chg: "#ff944d",
    chh: "#ff00ff",
    depth: "#525252",
  },
  maskCpgByCoverage: false,
};

const methylCShowRows: MethylCShowRows = {
  fwdCpg: true,
  fwdChg: false,
  fwdChh: true,
  fwdDepth: false,
  revCpg: false,
  revChg: false,
  revChh: false,
  revDepth: true,
};

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let getBBoxDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  getBBoxDescriptor = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 140, height: 20 }),
  });
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;

  if (getBBoxDescriptor) {
    Object.defineProperty(SVGElement.prototype, "getBBox", getBBoxDescriptor);
  } else {
    delete (SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox;
  }
});

describe("track tooltips", () => {
  it("shows genomic reader chromosome coordinates for BigBed tracks", () => {
    mount(
      <BigBedTooltip
        item={{ chromosome: "chr1", start: 10, end: 20, fields: [] }}
        context={context("bigbed", { url: "YOUR_URL_HERE", rowHeight: 12 })}
      />,
    );

    expect(tooltipText()).toEqual(["Location", "chr1:10–20"]);
  });

  it("shows genomic reader chromosome coordinates for bulk BigBed tracks", () => {
    mount(
      <BulkBedTooltip
        item={{
          chromosome: "chr2",
          start: 30,
          end: 40,
          fields: [],
          datasetName: "Sample",
        }}
        context={context("bulkbed", {
          datasets: [{ name: "Sample", url: "YOUR_URL_HERE" }],
          rowHeight: 12,
        })}
      />,
    );

    expect(tooltipText()).toEqual(["Sample", "Location", "chr2:30–40"]);
  });

  it("always renders exactly one BigWig signal row from item.max", () => {
    const rerender = mount(
      <BigWigTooltip
        item={{ x: 0, min: -8, max: 5.75 }}
        context={context("bigwig", {
          url: "YOUR_URL_HERE",
          fillWithZero: false,
          showClampIndicators: true,
          clampIndicatorColor: "#ff0000",
        })}
      />,
    );

    expect(tooltipText()).toEqual(["Signal", "5.75"]);

    rerender(
      <BigWigTooltip
        item={{ x: 0, min: null, max: null }}
        context={context("bigwig", {
          url: "YOUR_URL_HERE",
          fillWithZero: false,
          showClampIndicators: true,
          clampIndicatorColor: "#ff0000",
        })}
      />,
    );

    expect(tooltipText()).toEqual(["Signal", "No data"]);
    expect(container?.textContent).not.toContain("Range");
  });

  it("preserves both CAVE rows, uses no-data text, and decorates each configured color", () => {
    const config: CaveConfig = {
      age: "Adulthood",
      neurotransmitter: "GABA",
      topColor: "#aabbcc",
      bottomColor: "#112233",
    };
    mount(
      <CaveTooltip
        item={{
          x: 0,
          top: { x: 0, min: null, max: null },
          bottom: { x: 0, min: null, max: null },
        }}
        context={context("cave", config)}
      />,
    );

    expect(tooltipText()).toEqual(["hmC", "No data", "OXBS", "No data"]);
    expectColorTreatment("#aabbcc");
    expectColorTreatment("#112233");
  });

  it("keeps configured methylC rows and order stable across data and no-data regions", () => {
    const rerender = mount(
      <MethylCTooltip
        item={methylCItem([1.25, null, 2.5, null, null, null, null, 18])}
        context={context("methylc", methylCConfig)}
      />,
    );

    expect(tooltipText()).toEqual(["Plus CpG", "1.25", "Plus CHH", "2.50", "Minus depth", "18.00"]);

    rerender(
      <MethylCTooltip
        item={methylCItem([null, null, Number.NaN, null, null, null, null, null])}
        context={context("methylc", methylCConfig)}
      />,
    );

    expect(tooltipText()).toEqual([
      "Plus CpG",
      "No data",
      "Plus CHH",
      "No data",
      "Minus depth",
      "No data",
    ]);
    expectColorTreatment(methylCConfig.colors.cpg);
    expectColorTreatment(methylCConfig.colors.chh);
    expectColorTreatment(methylCConfig.colors.depth);
  });

  it("shows an explicit methylC empty state when every channel is disabled", () => {
    const showRows = Object.fromEntries(
      Object.keys(methylCShowRows).map((key) => [key, false]),
    ) as MethylCShowRows;
    mount(
      <MethylCTooltip
        item={{ tooltipValues: [], showRows }}
        context={context("methylc", methylCConfig)}
      />,
    );

    expect(tooltipText()).toEqual(["Channels", "None enabled"]);
  });
});

function context<Config>(type: string, config: Config): TrackRuntimeContext<Config> {
  return {
    type,
    base: { id: type, title: type, display: "full", height: 40, color: "#000000" },
    config: config as Config extends object ? Readonly<Config> : Config,
  };
}

function methylCItem(values: (number | null)[]): MethylCTooltipItem {
  return {
    showRows: methylCShowRows,
    tooltipValues: values.map((max, x) => ({ x, min: max, max })),
  };
}

function mount(node: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  const rerender = (nextNode: ReactNode) => {
    act(() => root?.render(<svg>{nextNode}</svg>));
  };

  rerender(node);
  return rerender;
}

function tooltipText() {
  return Array.from(container?.querySelectorAll('[role="tooltip"] text') ?? []).map(
    (element) => element.textContent,
  );
}

function expectColorTreatment(color: string) {
  const decorations = Array.from(container?.querySelectorAll('[role="tooltip"] rect') ?? []).filter(
    (element) => element.getAttribute("fill") === color,
  );

  expect(decorations).toHaveLength(2);
  expect(decorations.some((element) => element.hasAttribute("fill-opacity"))).toBe(true);
  expect(decorations.some((element) => !element.hasAttribute("fill-opacity"))).toBe(true);
}
