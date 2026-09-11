// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
} from "@weng-lab/genomebrowser";
import { FullBigWig } from "../../src/bigwig/render";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it("paints an opaque genomic highlight behind track marks and keeps row backgrounds transparent", async () => {
  const module = defineTrackModule({
    type: "colored-marks",
    configSchema: z.object({
      url: z.string(),
      fillWithZero: z.boolean(),
      showClampIndicators: z.boolean(),
      clampIndicatorColor: z.string(),
    }),
    fetch: async () => [
      { kind: "value" as const, chromosome: "chr1", start: 125, end: 135, value: 5 },
    ],
    render: { full: FullBigWig },
  });
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 1000 } },
    region: { chromosome: "chr1", start: 100, end: 200 },
    marginWidth: 100,
    trackWidth: 500,
    highlights: [{ id: "opaque", region: { start: 120, end: 180 }, color: "#ffff00", opacity: 1 }],
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: [
      module.create({
        id: "marks",
        title: "Marks",
        color: "#008000",
        config: {
          url: "YOUR_URL_HERE",
          fillWithZero: false,
          showClampIndicators: true,
          clampIndicatorColor: "#ff0000",
        },
      }),
    ],
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />);
    });
    const highlight = container.querySelector('rect[fill="#ffff00"]')!;
    const mark = container.querySelector('path[fill="#008000"]')!;
    expect(container.querySelector('g[clip-path] rect[fill="#ffffff"]')).toBeNull();
    expect(mark.getAttribute("d")).toContain("L");
    expect(highlight.getAttribute("fill-opacity")).toBe("1");
    expect(highlight.compareDocumentPosition(mark) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(highlight.closest('[pointer-events="none"]')).not.toBeNull();
    const title = Array.from(container.querySelectorAll("text")).find((text) =>
      text.textContent?.startsWith("Marks"),
    )!;
    expect(title.parentElement?.querySelector('rect[x="100"][y="0"]')?.getAttribute("fill")).toBe(
      "transparent",
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
