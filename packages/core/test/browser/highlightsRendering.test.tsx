// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Highlights } from "../../src/browser/overlays/Highlights";
import { BrowserProvider } from "../../src/browser/state/BrowserContext";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { createSettingsStore } from "../../src/browser/state/settingsStore";
import { createTrackStore } from "../../src/browser/state/trackStore";

describe("highlight rendering", () => {
  it("renders mixed filled and outlined regions without filling the outline", () => {
    const region = { chromosome: "chr1", start: 100, end: 200 };
    const browserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 1000 } },
      region,
      highlights: [
        { id: "filled", region: { start: 120, end: 140 }, color: "red" },
        { id: "outline", region: { start: 150, end: 180 }, color: "blue", type: "outlined" },
      ],
    });
    const html = renderToStaticMarkup(
      <BrowserProvider
        value={{
          browserStore,
          trackStore: createTrackStore({ modules: [], tracks: [] }),
          contextMenuStore: createContextMenuStore(),
          settingsStore: createSettingsStore(),
        }}
      >
        <svg>
          <Highlights
            region={region}
            marginWidth={100}
            renderWidth={1000}
            contentX={100}
            browserWidth={1100}
            totalHeight={200}
          />
        </svg>
      </BrowserProvider>,
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    const filled = container.querySelector('rect[fill="red"]')!;
    expect(filled.getAttribute("fill-opacity")).toBe("0.2");
    const outline = container.querySelector('rect[stroke="blue"]')!;
    expect(outline.getAttribute("fill")).toBe("none");
    expect(outline.getAttribute("stroke-width")).toBe("2");
    expect(outline.getAttribute("stroke-opacity")).toBe("1");
    expect(outline.getAttribute("vector-effect")).toBe("non-scaling-stroke");
    expect(outline.getAttribute("height")).toBe("198");
    expect(outline.closest("[clip-path]")).not.toBeNull();
    expect(outline.closest('[pointer-events="none"]')).not.toBeNull();
  });
});
