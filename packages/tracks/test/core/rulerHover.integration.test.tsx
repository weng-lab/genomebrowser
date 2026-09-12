// @vitest-environment jsdom
import { act } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it("owns hover highlights and clears them without removing user or other ruler highlights", async () => {
  const module = {
    ...rulerModule,
    fetch: async () => ({
      records: [{ chromosome: "chr1", start: 0, end: 1000, sequence: "A".repeat(1000) }],
    }),
  };
  const trackStore = createTrackStore({
    modules: [module],
    tracks: ["one", "two"].map((id) =>
      rulerModule.create({
        id,
        title: id,
        config: {
          sequenceUrl: "https://example.test/ref.2bit",
          sequenceMinPixelsPerBase: 5,
          sequenceHighlightColor: id === "one" ? "#ff8800" : "#0088ff",
        },
      }),
    ),
  });
  const saved = {
    id: "saved",
    region: { chromosome: "chr1", start: 90, end: 110 },
    color: "#ff0000",
  };
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 1000 } },
    region: { chromosome: "chr1", start: 100, end: 200 },
    trackWidth: 1000,
    highlights: [saved],
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const highlights = () => browserStore.getState().highlights;
  const point = async (ruler: number, position: number, type = "pointerover", buttons = 0) => {
    const base = container.querySelectorAll(`[aria-label="chr1:${position} A"]`)[ruler];
    expect(base).toBeDefined();
    await act(async () => {
      base!.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          buttons,
          clientX: 100 + (position - 100) * 10 + 5,
          clientY: 125 + ruler * 100,
        }),
      );
    });
  };
  try {
    await act(async () => {
      root.render(
        <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
      );
    });
    const zoomArea = container.querySelector("[data-ruler-zoom-area]")!;
    vi.spyOn(zoomArea, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 100, 1000, 22));
    const move = async (x: number, buttons = 0) => {
      await act(async () => {
        container.querySelector("[data-ruler-zoom-area]")!.dispatchEvent(
          new MouseEvent(x >= 100 ? "pointermove" : "pointerout", {
            bubbles: true,
            clientX: x,
            clientY: 110,
            buttons,
          }),
        );
      });
    };
    // Dialog content/backdrops and another browser can overlap the ruler's bounds.
    for (const target of [
      document.createElement("div"),
      document.createElementNS("http://www.w3.org/2000/svg", "svg"),
    ]) {
      document.body.appendChild(target);
      try {
        const moveOverOverlay = async () => {
          await act(async () => {
            target.dispatchEvent(
              new MouseEvent("pointermove", {
                bubbles: true,
                clientX: 115,
                clientY: 125,
              }),
            );
          });
        };
        await moveOverOverlay();
        expect(browserStore.getState().selectionMode).toBe("pan");
        expect(highlights()).toEqual([saved]);
        await move(110);
        await point(0, 100);
        expect(highlights()).toHaveLength(2);
        await move(50);
        await point(0, 100, "pointerout");
        await moveOverOverlay();
        expect(browserStore.getState().selectionMode).toBe("pan");
        expect(highlights()).toEqual([saved]);
      } finally {
        target.remove();
      }
    }
    expect(zoomArea.getAttribute("height")).toBe("22");
    expect(zoomArea.getAttribute("pointer-events")).toBe("all");
    await point(0, 100);
    expect(browserStore.getState().selectionMode).toBe("pan");
    expect(highlights()).toHaveLength(2);
    await point(0, 100, "pointerout");
    await move(110);
    expect(browserStore.getState().selectionMode).toBe("pan");
    await move(50, 1);
    expect(browserStore.getState().selectionMode).toBe("pan");
    await move(50);
    expect(browserStore.getState().selectionMode).toBe("pan");
    await move(110);
    await act(async () => {
      document.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(browserStore.getState().selectionMode).toBe("pan");
    await move(50);
    await act(async () => {
      browserStore.getState().setSelectionMode("zoom");
    });
    await move(110);
    await act(async () => {
      document.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(browserStore.getState().selectionMode).toBe("zoom");
    await move(50);
    await act(async () => {
      browserStore.getState().setSelectionMode("highlight");
    });
    await move(110);
    await move(50);
    expect(browserStore.getState().selectionMode).toBe("highlight");
    await act(async () => {
      browserStore.getState().setSelectionMode("pan");
    });
    await move(110);
    await point(0, 100);
    expect(highlights()).toHaveLength(2);
    expect(highlights()[1]?.color).toBe("#ff8800");
    expect(highlights()[1]?.region).toEqual({ chromosome: "chr1", start: 100, end: 101 });
    await act(async () => {
      trackStore.getState().updateTrack("one", { config: { sequenceHighlightColor: "#00aa88" } });
    });
    expect(highlights()).toEqual([saved]);
    await point(0, 100);
    expect(highlights()[1]?.color).toBe("#00aa88");
    await point(0, 101, "pointermove");
    expect(highlights()).toHaveLength(2);
    expect(highlights()[1]?.region.start).toBe(101);
    await point(1, 102);
    expect(highlights()).toHaveLength(3);
    expect(highlights()[2]?.color).toBe("#0088ff");
    expect(new Set(highlights().map(({ id }) => id)).size).toBe(3);
    await point(0, 101, "pointerout");
    expect(highlights()).toHaveLength(2);
    expect(highlights()[1]?.region.start).toBe(102);
    await point(1, 102, "pointermove", 1);
    expect(highlights()).toEqual([saved]);
    await point(0, 100);
    await act(async () => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(highlights()).toEqual([saved]);
    await point(0, 100);
    await act(async () => {
      browserStore.getState().setRegion({ chromosome: "chr1", start: 101, end: 201 });
    });
    expect(highlights()).toEqual([saved]);
    await point(0, 102);
    vi.spyOn(
      container.querySelector("[data-ruler-zoom-area]")!,
      "getBoundingClientRect",
    ).mockReturnValue(new DOMRect(100, 100, 1000, 22));
    await move(50);
    await move(110);
    expect(browserStore.getState().selectionMode).toBe("pan");
    // Simulate core replacing the ruler with loading content during pointer-up.
    document.addEventListener("pointerup", () => flushSync(() => root.render(null)), {
      once: true,
    });
    await act(async () => {
      document.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(browserStore.getState().selectionMode).toBe("pan");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
  expect(highlights()).toEqual([saved]);
});
