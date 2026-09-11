// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { z } from "zod";
import { GenomeBrowser } from "../../src/browser/GenomeBrowser";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import type { TrackRendererProps } from "../../src/modules/types";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it("paints an opaque genomic highlight behind track marks and keeps row backgrounds transparent", async () => {
  const module = defineTrackModule({
    type: "colored-marks",
    configSchema: z.object({}),
    fetch: async () => null,
    render: {
      full: ({ region, width }: TrackRendererProps<Record<string, never>, null>) => (
        <rect
          data-testid="mark"
          x={((125 - region.start) / (region.end - region.start)) * width}
          width={20}
          height={20}
          fill="#008000"
        />
      ),
    },
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
    tracks: [module.create({ id: "marks", title: "Marks", config: {} })],
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />);
    });
    const highlight = container.querySelector('rect[fill="#ffff00"]')!;
    const mark = container.querySelector('[data-testid="mark"]')!;
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
