// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelectRegion } from "../../src/browser/viewport/SelectRegion";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import type { GenomicRegion } from "../../src/genome/region";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let svg: SVGSVGElement | undefined;
let root: Root | undefined;
type SelectionTestProps = Pick<Parameters<typeof SelectRegion>[0], "region" | "setRegion"> &
  Partial<
    Pick<
      Parameters<typeof SelectRegion>[0],
      "disabled" | "trackWidth" | "marginWidth" | "totalHeight"
    >
  >;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  svg?.remove();
  root = undefined;
  svg = undefined;
});

describe("SelectRegion", () => {
  it("preserves ordinary selection behavior away from chromosome boundaries", async () => {
    const region = { chromosome: "chr1", start: 100, end: 200 };
    const store = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 1_000 } },
      region,
    });
    await renderSelection({ region, setRegion: store.getState().setRegion });

    await dragSelection(45, 95);

    expect(store.getState().region).toEqual({ chromosome: "chr1", start: 125, end: 175 });
  });

  it.each([
    ["lower", -20, 70, { chromosome: "chr1", start: 0, end: 50 }],
    ["upper", 70, 150, { chromosome: "chr1", start: 50, end: 100 }],
  ] as const)(
    "commits a selection clamped to the %s viewport and chromosome boundary",
    async (_edge, startX, endX, expected) => {
      const region = { chromosome: "chr1", start: 0, end: 100 };
      const store = createBrowserStore({
        assembly: { id: "test", chromosomes: { chr1: 100 } },
        region,
      });
      await renderSelection({ region, setRegion: store.getState().setRegion });

      await dragSelection(startX, endX);

      expect(store.getState().region).toEqual(expected);
    },
  );

  it("preserves the committed region when selection normalization rejects the candidate", async () => {
    const region = { chromosome: "chr1", start: 0, end: 1 };
    const store = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 100 } },
      region,
    });
    const before = store.getState();
    await renderSelection({ region, setRegion: store.getState().setRegion });

    await dragSelection(20, 30);

    expect(store.getState()).toBe(before);
    expect(store.getState().region).toEqual(region);
    expect(svg?.querySelector("#selectRegion")).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not begin or commit a selection with invalid track width %s",
    async (trackWidth) => {
      const setRegion = vi.fn((_region: GenomicRegion) => ({
        ok: false as const,
        code: "INVALID_COORDINATE" as const,
        error: "not committed",
      }));
      await renderSelection({
        region: { chromosome: "chr1", start: 20, end: 40 },
        trackWidth,
        setRegion,
      });

      await dragSelection(20, 80);

      expect(setRegion).not.toHaveBeenCalled();
      expect(svg?.querySelector("#selectRegion")).toBeNull();
    },
  );

  it.each([
    ["margin width", { marginWidth: 0 }],
    ["non-finite margin width", { marginWidth: Number.NaN }],
    ["total height", { totalHeight: 0 }],
    ["non-finite total height", { totalHeight: Number.POSITIVE_INFINITY }],
  ] as const)("does not commit a selection with invalid %s", async (_name, dimensions) => {
    const setRegion = vi.fn((_region: GenomicRegion) => ({
      ok: false as const,
      code: "INVALID_COORDINATE" as const,
      error: "not committed",
    }));
    await renderSelection({
      region: { chromosome: "chr1", start: 20, end: 40 },
      setRegion,
      ...dimensions,
    });

    await dragSelection(20, 80);

    expect(setRegion).not.toHaveBeenCalled();
  });

  it.each([
    ["interaction gate", { disabled: true }],
    ["region", { region: { chromosome: "chr1", start: 30, end: 50 } }],
    ["track width", { trackWidth: 200 }],
    ["margin width", { marginWidth: 40 }],
    ["total height", { totalHeight: 200 }],
  ] as const)("cancels an active drag when the %s changes", async (_name, changedProps) => {
    const setRegion = vi.fn((_region: GenomicRegion) => ({
      ok: true as const,
      region: _region,
      clamped: false,
    }));
    const initialProps = {
      region: { chromosome: "chr1", start: 20, end: 40 },
      setRegion,
    };
    await renderSelection(initialProps);
    await startSelection(30, 80);
    expect(svg?.querySelector("#selectRegion")).not.toBeNull();

    await rerenderSelection({ ...initialProps, ...changedProps });
    await act(async () => document.dispatchEvent(new MouseEvent("mouseup")));

    expect(setRegion).not.toHaveBeenCalled();
    expect(svg?.querySelector("#selectRegion")).toBeNull();
  });
});

async function renderSelection(props: SelectionTestProps) {
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const point = {
    x: 0,
    y: 0,
    matrixTransform: () => ({ x: point.x, y: point.y }),
  };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
  document.body.appendChild(svg);
  root = createRoot(svg);
  await rerenderSelection(props);
}

async function rerenderSelection({
  region,
  setRegion,
  trackWidth = 100,
  marginWidth = 20,
  totalHeight = 100,
  disabled = false,
}: SelectionTestProps) {
  await act(async () =>
    root?.render(
      <SelectRegion
        svg={svg!}
        marginWidth={marginWidth}
        trackWidth={trackWidth}
        totalHeight={totalHeight}
        region={region}
        setRegion={setRegion}
        disabled={disabled}
      />,
    ),
  );
}

async function startSelection(startX: number, endX: number) {
  const hitArea = svg?.querySelector("rect");
  if (!hitArea) throw new Error("Expected selection hit area");

  await act(async () => {
    hitArea.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0, clientX: startX, clientY: 0 }),
    );
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: endX, clientY: 0 }));
  });
}

async function dragSelection(startX: number, endX: number) {
  await startSelection(startX, endX);
  await act(async () => document.dispatchEvent(new MouseEvent("mouseup")));
}
