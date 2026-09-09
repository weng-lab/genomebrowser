// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { createBrowserStore } from "@weng-lab/genomebrowser";
import { BrowserSelectionControls } from "../src/lib";
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
          <BrowserSelectionControls browserStore={useFirst} />
          <BrowserSelectionControls browserStore={useSecond} disabled />
        </>,
      ),
    );
    const buttons = Array.from(container.querySelectorAll("button"));
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
