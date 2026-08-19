// @vitest-environment jsdom

import { act, type ComponentType, type ReactNode } from "react";
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";
import { caveModule } from "@weng-lab/genomebrowser-tracks/cave";
import { methylCModule } from "@weng-lab/genomebrowser-tracks/methylc";
import { transcriptModule } from "@weng-lab/genomebrowser-tracks/transcript";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

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
  vi.useRealTimers();
  if (getBBoxDescriptor) Object.defineProperty(SVGElement.prototype, "getBBox", getBBoxDescriptor);
  else delete (SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox;
});

describe("pre-bound module UI", () => {
  it("uses the formatted BigBed tooltip", () => {
    const Tooltip = bigBedModule.tooltipComponent as ComponentType<any>;
    mount(
      <svg>
        <Tooltip
          item={{ chromosome: "chr1", start: 10, end: 20, fields: [], score: 2.5 }}
          context={{
            type: "bigbed",
            base: { id: "peaks", title: "Peaks", display: "dense", height: 60, color: "#4b9560" },
            config: { url: "YOUR_URL_HERE" },
          }}
        />
      </svg>,
    );

    expect(text()).toEqual(["Location", "chr1:10–20", "Score", "2.5"]);
  });

  it("uses the formatted signal and transcript tooltips", () => {
    const SignalTooltip = bigWigModule.tooltipComponent as ComponentType<any>;
    const TranscriptTooltip = transcriptModule.tooltipComponent as ComponentType<any>;
    const rerender = mount(
      <svg>
        <SignalTooltip
          item={{ x: 0, min: null, max: null }}
          context={{
            type: "bigwig",
            base: { id: "signal", title: "Signal", display: "full", height: 80, color: "#2266aa" },
            config: {},
          }}
        />
      </svg>,
    );
    expect(text()).toEqual(["Signal", "No data"]);

    rerender(
      <svg>
        <TranscriptTooltip
          item={{
            id: "ENST1",
            name: "GENE1",
            coordinates: { start: 1000, end: 2000 },
            strand: "+",
          }}
          context={{}}
        />
      </svg>,
    );
    expect(text()).toEqual(["GENE1", "ID", "ENST1", "Interval", "1,000–2,000", "Strand", "+"]);
  });

  it("uses the formatted BulkBed, CAVE, and MethylC tooltips", () => {
    const BulkTooltip = bulkBedModule.tooltipComponent as ComponentType<any>;
    const CaveTooltip = caveModule.tooltipComponent as ComponentType<any>;
    const MethylCTooltip = methylCModule.tooltipComponent as ComponentType<any>;
    const rerender = mount(
      <svg>
        <BulkTooltip
          item={{
            chromosome: "chr2",
            start: 30,
            end: 40,
            fields: [],
            datasetName: "Sample",
          }}
          context={{
            type: "bulkbed",
            base: { id: "bulk", title: "Bulk", display: "full", height: 80 },
            config: { datasets: [{ name: "Sample", url: "YOUR_URL_HERE" }] },
          }}
        />
      </svg>,
    );
    expect(text()).toEqual(["Sample", "Location", "chr2:30–40"]);

    rerender(
      <svg>
        <CaveTooltip
          item={{
            x: 0,
            top: { x: 0, min: null, max: null },
            bottom: { x: 0, min: 0.25, max: 0.25 },
          }}
          context={{ config: { topColor: "#aabbcc", bottomColor: "#112233" } }}
        />
      </svg>,
    );
    expect(text()).toEqual(["hmC", "No data", "OXBS", "0.25"]);

    rerender(
      <svg>
        <MethylCTooltip
          item={{
            tooltipValues: [{ x: 0, min: 1.25, max: 1.25 }],
            showRows: {
              fwdCpg: true,
              fwdChg: false,
              fwdChh: false,
              fwdDepth: false,
              revCpg: false,
              revChg: false,
              revChh: false,
              revDepth: false,
            },
          }}
          context={{
            config: {
              colors: {
                cpg: "#648bd8",
                chg: "#ff944d",
                chh: "#ff00ff",
                depth: "#525252",
              },
            },
          }}
        />
      </svg>,
    );
    expect(text()).toEqual(["Plus CpG", "1.25"]);
  });

  it("commits BigBed settings through the module-bound settings component", () => {
    vi.useFakeTimers();
    const Settings = bigBedModule.settingsComponent as ComponentType<any>;
    const updateTrack = vi.fn(() => ({ ok: true as const }));
    mount(
      <Settings
        track={bigBedModule.create({
          id: "peaks",
          title: "Peaks",
          config: { url: "YOUR_URL_HERE" },
        })}
        updateTrack={updateTrack}
      />,
    );
    const input = container?.querySelector<HTMLInputElement>('input[type="url"]');
    if (!input) throw new Error("Could not find the BigBed URL input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Could not set the BigBed URL input");
    act(() => {
      setter.call(input, "UPDATED_URL");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      vi.advanceTimersByTime(300);
    });
    expect(updateTrack).toHaveBeenCalledWith({ config: { url: "UPDATED_URL" } });
  });
});

function mount(node: ReactNode) {
  container ??= document.createElement("div");
  if (!container.isConnected) document.body.append(container);
  root ??= createRoot(container);
  const rerender = (next: ReactNode) => act(() => root?.render(next));
  rerender(node);
  return rerender;
}

function text() {
  return Array.from(container?.querySelectorAll('[role="tooltip"] text') ?? []).map(
    (element) => element.textContent,
  );
}
