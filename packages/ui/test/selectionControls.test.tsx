// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { createBrowserStore } from "@weng-lab/genomebrowser";
import { SelectionControls } from "../src/lib";
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
it("keeps buttons and external mode changes synchronized, isolates stores, and supports disabled controls", () => {
  const input = {
    assembly: { id: "test", chromosomes: { chr1: 100 } },
    region: { chromosome: "chr1", start: 0, end: 100 },
  };
  const useFirst = createBrowserStore(input);
  const useSecond = createBrowserStore(input);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() =>
      root.render(
        <>
          <SelectionControls browserStore={useFirst} />
          <SelectionControls browserStore={useSecond} disabled />
        </>,
      ),
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.slice(0, 3).map((button) => button.getAttribute("aria-label"))).toEqual([
      "Pan",
      "Zoom",
      "Highlight",
    ]);
    expect(buttons.every((button) => button.querySelector("svg") && !button.textContent)).toBe(
      true,
    );
    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("true");
    act(() => buttons[1]?.click());
    expect(useFirst.getState().selectionMode).toBe("zoom");
    expect(useSecond.getState().selectionMode).toBe("pan");
    act(() => useFirst.getState().setSelectionMode("highlight"));
    expect(buttons[2]?.getAttribute("aria-pressed")).toBe("true");
    act(() => buttons[2]?.click());
    expect(useFirst.getState().selectionMode).toBe("highlight");
    expect(buttons.slice(3).every((button) => button.disabled)).toBe(true);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

it("names each icon-only mode in its tooltip", async () => {
  vi.useFakeTimers();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    const useBrowserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 100 } },
      region: { chromosome: "chr1", start: 0, end: 100 },
    });
    act(() => root.render(<SelectionControls browserStore={useBrowserStore} />));
    const tooltips: (string | null)[] = [];
    for (const button of container.querySelectorAll("button")) {
      await act(async () => {
        button.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        await vi.advanceTimersByTimeAsync(1000);
      });
      const tooltip = document.querySelector('[role="tooltip"]');
      expect(button.getAttribute("aria-describedby")).toBe(tooltip?.id);
      tooltips.push(tooltip?.textContent ?? null);
      await act(async () => {
        button.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    expect(tooltips).toEqual([
      "Pan: drag to move the region",
      "Zoom: drag to select a region to zoom into",
      "Highlight: drag to highlight a region",
    ]);
  } finally {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  }
});
