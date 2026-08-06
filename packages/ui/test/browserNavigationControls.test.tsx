// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { hg38, type GenomicRegion } from "@weng-lab/genomebrowser";
import { BrowserNavigationControls, type BrowserNavigationControlsProps } from "../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("BrowserNavigationControls", () => {
  it("exports its public component and props", () => {
    expect(BrowserNavigationControls).toBeTypeOf("function");
    expectTypeOf(BrowserNavigationControls)
      .parameter(0)
      .toEqualTypeOf<BrowserNavigationControlsProps>();
  });

  it("pans by viewport-relative steps", () => {
    const onRegionChange = vi.fn();
    mount({
      region: { chromosome: "chr1", start: 1_000, end: 2_000 },
      onRegionChange,
    });

    clickButton("Pan left by half a viewport");
    expect(onRegionChange).toHaveBeenLastCalledWith({
      chromosome: "chr1",
      start: 500,
      end: 1_500,
    });

    renderControls({
      region: onRegionChange.mock.lastCall?.[0] as GenomicRegion,
      onRegionChange,
    });
    clickButton("Pan right by a quarter viewport");
    expect(onRegionChange).toHaveBeenLastCalledWith({
      chromosome: "chr1",
      start: 750,
      end: 1_750,
    });
  });

  it("rounds fractional base spans to the nearest whole base", () => {
    const onRegionChange = vi.fn();
    mount({
      region: { chromosome: "chr1", start: 100, end: 103 },
      onRegionChange,
    });

    clickButton("Pan right by half a viewport");
    expect(onRegionChange).toHaveBeenLastCalledWith({
      chromosome: "chr1",
      start: 102,
      end: 105,
    });

    clickButton("Zoom out 1.5×");
    expect(onRegionChange).toHaveBeenLastCalledWith({
      chromosome: "chr1",
      start: 99,
      end: 104,
    });
  });

  it("keeps the viewport span when panning to a chromosome boundary", () => {
    const onRegionChange = vi.fn();
    mount({
      region: { chromosome: "chr1", start: 100, end: 1_100 },
      onRegionChange,
    });

    clickButton("Pan left by one viewport");
    expect(onRegionChange).toHaveBeenCalledWith({ chromosome: "chr1", start: 0, end: 1_000 });
  });

  it("zooms around the center and constrains the result to chromosome bounds", () => {
    const onRegionChange = vi.fn();
    mount({
      region: { chromosome: "chr1", start: 1_000, end: 2_000 },
      onRegionChange,
    });

    clickButton("Zoom in 3×");
    expect(onRegionChange).toHaveBeenLastCalledWith({
      chromosome: "chr1",
      start: 1_334,
      end: 1_667,
    });

    clickButton("Zoom out 3×");
    expect(onRegionChange).toHaveBeenLastCalledWith({
      chromosome: "chr1",
      start: 0,
      end: 3_000,
    });
  });

  it("preserves the requested span at the right chromosome boundary", () => {
    const chromosomeLength = hg38.chromosomes.chr1;
    const onRegionChange = vi.fn();
    mount({
      region: { chromosome: "chr1", start: chromosomeLength - 1_000, end: chromosomeLength },
      onRegionChange,
    });

    clickButton("Zoom out 3×");
    expect(onRegionChange).toHaveBeenCalledWith({
      chromosome: "chr1",
      start: chromosomeLength - 3_000,
      end: chromosomeLength,
    });
  });

  it("disables actions that cannot move the current region", () => {
    mount({
      region: { chromosome: "chr1", start: 0, end: hg38.chromosomes.chr1 },
      onRegionChange: vi.fn(),
    });

    expect(getButton("Pan left by one viewport").disabled).toBe(true);
    expect(getButton("Pan right by one viewport").disabled).toBe(true);
    expect(getButton("Zoom out 10×").disabled).toBe(true);
    expect(getButton("Zoom in 1.5×").disabled).toBe(false);
  });

  it("disables every action when requested", () => {
    mount({
      region: { chromosome: "chr1", start: 1_000, end: 2_000 },
      onRegionChange: vi.fn(),
      disabled: true,
    });

    expect(container?.querySelectorAll("button:not(:disabled)")).toHaveLength(0);
  });

  it("disables every action for an invalid controlled region", () => {
    mount({
      region: { chromosome: "chr1", start: -1, end: 2_000 },
      onRegionChange: vi.fn(),
    });

    expect(container?.querySelectorAll("button:not(:disabled)")).toHaveLength(0);
  });

  it("disables zooming in at a one-base region", () => {
    mount({
      region: { chromosome: "chr1", start: 1_000, end: 1_001 },
      onRegionChange: vi.fn(),
    });

    expect(getButton("Zoom in 1.5×").disabled).toBe(true);
    expect(getButton("Zoom out 1.5×").disabled).toBe(false);
  });
});

function mount({
  region,
  onRegionChange,
  disabled,
}: {
  region: GenomicRegion;
  onRegionChange: (region: GenomicRegion) => void;
  disabled?: boolean;
}) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  renderControls({ region, onRegionChange, disabled });
}

function renderControls({
  region,
  onRegionChange,
  disabled,
}: {
  region: GenomicRegion;
  onRegionChange: (region: GenomicRegion) => void;
  disabled?: boolean;
}) {
  act(() =>
    root?.render(
      <BrowserNavigationControls
        assembly={hg38}
        disabled={disabled}
        region={region}
        onRegionChange={onRegionChange}
      />,
    ),
  );
}

function getButton(label: string) {
  const button = container?.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) throw new Error(`Could not find button labeled ${label}`);
  return button;
}

function clickButton(label: string) {
  act(() => getButton(label).click());
}
