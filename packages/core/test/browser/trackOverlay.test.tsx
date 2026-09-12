// @vitest-environment jsdom
import { act, createContext, use, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { TrackLabel, TrackOverlay } from "../../src/lib";
import { trackOverlayContext } from "../../src/browser/track-overlay/context";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it("portals into a stationary layer, preserves context, resizes, and removes labels on unmount", async () => {
  const container = document.createElement("div");
  container.innerHTML = '<svg><g id="moving"></g><g id="fixed"></g></svg>';
  document.body.append(container);
  const moving = container.querySelector<SVGGElement>("#moving")!;
  const target = container.querySelector<SVGGElement>("#fixed")!;
  const context = createContext("missing");
  function ContextLabel() {
    return <text>{use(context)}</text>;
  }
  const root = createRoot(moving);
  async function render(width: number, children: ReactNode) {
    await act(async () =>
      root.render(
        <trackOverlayContext.Provider value={{ target, width, height: 80 }}>
          <context.Provider value="preserved">{children}</context.Provider>
        </trackOverlayContext.Provider>,
      ),
    );
  }
  try {
    await render(
      500,
      <>
        <TrackLabel anchor="top-right">42</TrackLabel>
        <TrackOverlay>
          <ContextLabel />
        </TrackOverlay>
      </>,
    );
    expect(moving.textContent).toBe("");
    expect(target.textContent).toBe("42preserved");
    const before = target.innerHTML;
    moving.setAttribute("transform", "translate(150,0)");
    expect(target.innerHTML).toBe(before);
    expect(target.querySelector("g")?.getAttribute("pointer-events")).toBe("none");
    const oldX = Number(target.querySelector("rect")?.getAttribute("x"));
    await render(700, <TrackLabel anchor="top-right">42</TrackLabel>);
    expect(Number(target.querySelector("rect")?.getAttribute("x"))).toBe(oldX + 200);
    await render(
      700,
      <TrackLabel anchor="left" y={80}>
        0
      </TrackLabel>,
    );
    expect(target.querySelector("rect")?.getAttribute("y")).toBe("66");
    await render(10, <TrackLabel anchor="top-left">too wide</TrackLabel>);
    expect(target.querySelector("text")).toBeNull();
    await act(async () => root.unmount());
    expect(target.innerHTML).toBe("");
  } finally {
    container.remove();
  }
});
