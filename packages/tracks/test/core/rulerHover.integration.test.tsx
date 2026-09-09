// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { expect, it } from "vitest";

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
      base!.dispatchEvent(new MouseEvent(type, { bubbles: true, buttons }));
    });
  };
  try {
    await act(async () => {
      root.render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />);
    });
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
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
  expect(highlights()).toEqual([saved]);
});
