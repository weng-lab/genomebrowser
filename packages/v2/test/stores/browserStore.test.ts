import { describe, expect, it } from "vitest";
import { createBrowserStore } from "../../src/stores/browserStore";

describe("createBrowserStore", () => {
  it("stores initial highlights", () => {
    const store = createBrowserStore({
      region: "chr1:100-200",
      highlights: [
        {
          id: "enhancer",
          region: { chromosome: "chr1", start: 120, end: 140 },
          color: "#ff0000",
        },
      ],
    });

    expect(store.getState().highlights).toEqual([
      {
        id: "enhancer",
        region: { chromosome: "chr1", start: 120, end: 140 },
        color: "#ff0000",
      },
    ]);
  });

  it("adds highlights and ignores duplicate ids", () => {
    const store = createBrowserStore({ region: "chr1:100-200" });

    store.getState().addHighlight({
      id: "target",
      region: { start: 130, end: 150 },
      color: "#00ff00",
    });
    store.getState().addHighlight({
      id: "target",
      region: { start: 160, end: 170 },
      color: "#0000ff",
    });

    expect(store.getState().highlights).toEqual([
      {
        id: "target",
        region: { start: 130, end: 150 },
        color: "#00ff00",
      },
    ]);
  });

  it("removes highlights by id", () => {
    const store = createBrowserStore({
      region: "chr1:100-200",
      highlights: [
        { id: "one", region: { start: 110, end: 120 }, color: "#111111" },
        { id: "two", region: { start: 130, end: 140 }, color: "#222222" },
      ],
    });

    store.getState().removeHighlight("one");

    expect(store.getState().highlights).toEqual([
      { id: "two", region: { start: 130, end: 140 }, color: "#222222" },
    ]);
  });

  it("rejects invalid highlight regions", () => {
    expect(() =>
      createBrowserStore({
        region: "chr1:100-200",
        highlights: [
          {
            id: "bad",
            region: { chromosome: "chr1", start: 140, end: 120 },
            color: "#ff0000",
          },
        ],
      }),
    ).toThrow(/Browser store input is invalid/);

    const store = createBrowserStore({ region: "chr1:100-200" });
    expect(() =>
      store.getState().addHighlight({
        id: "bad",
        region: { start: 140, end: 120 },
        color: "#ff0000",
      }),
    ).toThrow(/Highlight is invalid/);
  });
});
