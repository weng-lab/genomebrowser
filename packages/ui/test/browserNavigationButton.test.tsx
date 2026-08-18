// @vitest-environment jsdom

import {
  createBrowserStore,
  type BrowserStoreInstance,
  type GenomicRegion,
} from "@weng-lab/genomebrowser";
import { act, Profiler, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  BrowserNavigationButton,
  type BrowserNavigationAction,
  type BrowserNavigationButtonProps,
} from "../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const assembly = { id: "test", chromosomes: { chr1: 100, chr2: 200 } };

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("BrowserNavigationButton", () => {
  it("exports its component and store-bound action contract from the package root", () => {
    type HasOnClick = "onClick" extends keyof BrowserNavigationButtonProps ? true : false;

    expect(BrowserNavigationButton).toBeTypeOf("function");
    expectTypeOf(BrowserNavigationButton)
      .parameter(0)
      .toEqualTypeOf<BrowserNavigationButtonProps>();
    expectTypeOf<BrowserNavigationButtonProps["action"]>().toEqualTypeOf<BrowserNavigationAction>();
    expectTypeOf<{ type: "pan"; fraction: number }>().toExtend<BrowserNavigationAction>();
    expectTypeOf<{ type: "zoom"; factor: number }>().toExtend<BrowserNavigationAction>();
    expectTypeOf<HasOnClick>().toEqualTypeOf<false>();
  });

  it("pans from the latest store region through setRegion with signed rounded shifts", () => {
    const browserStore = createTestStore({ chromosome: "chr1", start: 10, end: 13 });
    const originalSetRegion = browserStore.getState().setRegion;
    const setRegion = vi.fn(originalSetRegion);
    browserStore.setState({ setRegion });

    mountButton(browserStore, { type: "pan", fraction: 0.5 }, "Move");
    clickButton();
    expect(setRegion).toHaveBeenLastCalledWith({ chromosome: "chr1", start: 12, end: 15 });
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 12, end: 15 });

    act(() => originalSetRegion({ chromosome: "chr1", start: 40, end: 43 }));
    renderButton(browserStore, { type: "pan", fraction: -0.1 }, "Move");
    clickButton();
    expect(setRegion).toHaveBeenLastCalledWith({ chromosome: "chr1", start: 39, end: 42 });
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 39, end: 42 });
  });

  it("preserves the viewport span while clamping pan movement to chromosome bounds", () => {
    const browserStore = createTestStore({ chromosome: "chr1", start: 5, end: 25 });
    mountButton(browserStore, { type: "pan", fraction: -1 }, "Move left");

    clickButton();

    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 0, end: 20 });
  });

  it("delegates enabled center-based zoom actions with only the declared factor", () => {
    const browserStore = createTestStore({ chromosome: "chr1", start: 10, end: 30 });
    const originalZoom = browserStore.getState().zoom;
    const zoom = vi.fn(originalZoom);
    browserStore.setState({ zoom });
    mountButton(browserStore, { type: "zoom", factor: 0.5 }, "Zoom");

    act(() => browserStore.getState().setRegion({ chromosome: "chr1", start: 40, end: 80 }));
    clickButton();

    expect(zoom).toHaveBeenCalledWith(0.5);
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 50, end: 70 });

    renderButton(browserStore, { type: "zoom", factor: 2 }, "Zoom out");
    const button = getButton();
    const keyDown = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    });
    act(() => button.dispatchEvent(keyDown));
    expect(keyDown.defaultPrevented).toBe(false);

    const clickDetails: number[] = [];
    button.addEventListener("click", (event) => clickDetails.push(event.detail));
    act(() =>
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 })),
    );

    expect(clickDetails).toEqual([0]);
    expect(zoom).toHaveBeenLastCalledWith(2);
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 40, end: 80 });
  });

  it("moves its availability subscription and activation target when the store is replaced", () => {
    const firstStore = createTestStore({ chromosome: "chr1", start: 80, end: 100 });
    const secondStore = createTestStore({ chromosome: "chr1", start: 50, end: 70 });
    mountButton(firstStore, { type: "pan", fraction: 0.5 }, "Move");
    expect(getButton().disabled).toBe(true);

    renderButton(secondStore, { type: "pan", fraction: 0.5 }, "Move");
    expect(getButton().disabled).toBe(false);

    act(() => secondStore.getState().setRegion({ chromosome: "chr1", start: 80, end: 100 }));
    expect(getButton().disabled).toBe(true);

    act(() => secondStore.getState().setRegion({ chromosome: "chr1", start: 50, end: 70 }));
    expect(getButton().disabled).toBe(false);
    clickButton();

    expect(firstStore.getState().region).toEqual({ chromosome: "chr1", start: 80, end: 100 });
    expect(secondStore.getState().region).toEqual({ chromosome: "chr1", start: 60, end: 80 });
  });

  it("uses coarse region boundaries and consumer state to disable navigation", () => {
    const browserStore = createTestStore({ chromosome: "chr1", start: 0, end: 20 });
    mountButton(browserStore, { type: "pan", fraction: -0.5 }, "Navigate");
    expect(getButton().disabled).toBe(true);

    renderButton(browserStore, { type: "pan", fraction: 0.5 }, "Navigate");
    expect(getButton().disabled).toBe(false);

    act(() => browserStore.getState().setRegion({ chromosome: "chr1", start: 80, end: 100 }));
    renderButton(browserStore, { type: "pan", fraction: -0.5 }, "Navigate");
    expect(getButton().disabled).toBe(false);

    renderButton(browserStore, { type: "pan", fraction: 0.5 }, "Navigate");
    expect(getButton().disabled).toBe(true);

    act(() => browserStore.getState().setRegion({ chromosome: "chr1", start: 0, end: 100 }));
    renderButton(browserStore, { type: "zoom", factor: 2 }, "Navigate");
    expect(getButton().disabled).toBe(true);

    act(() => browserStore.getState().setRegion({ chromosome: "chr1", start: 20, end: 21 }));
    renderButton(browserStore, { type: "zoom", factor: 0.5 }, "Navigate");
    expect(getButton().disabled).toBe(true);

    renderButton(browserStore, { type: "zoom", factor: 1.0001 }, "Navigate");
    expect(getButton().disabled).toBe(false);

    renderButton(browserStore, { type: "pan", fraction: 0.5 }, "Navigate", true);
    expect(getButton().disabled).toBe(true);
  });

  it.each<BrowserNavigationAction>([
    { type: "pan", fraction: 0 },
    { type: "pan", fraction: Number.NaN },
    { type: "pan", fraction: Number.POSITIVE_INFINITY },
    { type: "zoom", factor: 0 },
    { type: "zoom", factor: -1 },
    { type: "zoom", factor: 1 },
    { type: "zoom", factor: Number.NaN },
    { type: "zoom", factor: Number.POSITIVE_INFINITY },
  ])("disables the invalid declaration $type", (action) => {
    const browserStore = createTestStore();
    mountButton(browserStore, action, "Navigate");

    expect(getButton().disabled).toBe(true);
    clickButton();
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 20, end: 40 });
  });

  it("disables invalid store regions without attempting navigation", () => {
    const browserStore = createTestStore();
    browserStore.setState({ region: { chromosome: "chr1", start: -1, end: 20 } });
    mountButton(browserStore, { type: "pan", fraction: 0.5 }, "Navigate");

    expect(getButton().disabled).toBe(true);
    clickButton();
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: -1, end: 20 });
  });

  it("generates concise direction names and honors explicit accessible names", () => {
    const browserStore = createTestStore();
    mountButton(browserStore, { type: "pan", fraction: -0.5 }, <span aria-hidden="true">←</span>);
    expect(getButton().getAttribute("aria-label")).toBe("Pan left");

    renderButton(browserStore, { type: "pan", fraction: 0.5 }, "Custom child");
    expect(getButton().getAttribute("aria-label")).toBe("Pan right");

    renderButton(browserStore, { type: "zoom", factor: 0.5 }, "Custom child");
    expect(getButton().getAttribute("aria-label")).toBe("Zoom in");

    renderButton(browserStore, { type: "zoom", factor: 2 }, "Custom child");
    expect(getButton().getAttribute("aria-label")).toBe("Zoom out");

    render(
      <BrowserNavigationButton
        action={{ type: "zoom", factor: 2 }}
        aria-label="Show more context"
        browserStore={browserStore}
      >
        Custom child
      </BrowserNavigationButton>,
    );
    expect(getButton().getAttribute("aria-label")).toBe("Show more context");

    render(
      <>
        <span id="navigation-name">Move along chromosome</span>
        <BrowserNavigationButton
          action={{ type: "pan", fraction: 0.5 }}
          aria-labelledby="navigation-name"
          browserStore={browserStore}
        >
          Custom child
        </BrowserNavigationButton>
      </>,
    );
    expect(getButton().hasAttribute("aria-label")).toBe(false);
    expect(getButton().getAttribute("aria-labelledby")).toBe("navigation-name");
  });

  it("forwards consumer presentation while remaining a native MUI button", () => {
    const browserStore = createTestStore();
    mount(
      <BrowserNavigationButton
        action={{ type: "pan", fraction: 0.5 }}
        browserStore={browserStore}
        className="consumer-navigation"
        data-presentation="custom"
        size="large"
        startIcon={<span data-icon="forward">→</span>}
        style={{ minWidth: 72 }}
        variant="contained"
      >
        Forward
      </BrowserNavigationButton>,
    );

    const button = getButton();
    expect(button.tagName).toBe("BUTTON");
    expect(button.classList.contains("consumer-navigation")).toBe(true);
    expect(button.dataset.presentation).toBe("custom");
    expect(button.style.minWidth).toBe("72px");
    expect(button.textContent).toContain("Forward");
    expect(button.querySelector("[data-icon='forward']")).not.toBeNull();
    expect(container?.querySelector("[role='tooltip']")).toBeNull();

    act(() => button.focus());
    expect(document.activeElement).toBe(button);
    clickButton();
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 30, end: 50 });
  });

  it("does not rerender for unrelated store updates but reacts to region availability", () => {
    const browserStore = createTestStore();
    let renderCount = 0;
    mount(
      <Profiler id="navigation" onRender={() => renderCount++}>
        <BrowserNavigationButton
          action={{ type: "pan", fraction: -0.5 }}
          browserStore={browserStore}
        >
          Move
        </BrowserNavigationButton>
      </Profiler>,
    );
    const initialRenderCount = renderCount;

    act(() => browserStore.getState().setTrackWidth(640));
    expect(renderCount).toBe(initialRenderCount);

    act(() => browserStore.getState().setRegion({ chromosome: "chr1", start: 0, end: 20 }));
    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(getButton().disabled).toBe(true);
  });
});

function createTestStore(region: GenomicRegion = { chromosome: "chr1", start: 20, end: 40 }) {
  return createBrowserStore({ assembly, region });
}

function mountButton(
  browserStore: BrowserStoreInstance,
  action: BrowserNavigationAction,
  children: ReactNode,
  disabled = false,
) {
  mount(
    <BrowserNavigationButton action={action} browserStore={browserStore} disabled={disabled}>
      {children}
    </BrowserNavigationButton>,
  );
}

function renderButton(
  browserStore: BrowserStoreInstance,
  action: BrowserNavigationAction,
  children: ReactNode,
  disabled = false,
) {
  render(
    <BrowserNavigationButton action={action} browserStore={browserStore} disabled={disabled}>
      {children}
    </BrowserNavigationButton>,
  );
}

function mount(node: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  render(node);
}

function render(node: ReactNode) {
  act(() => root?.render(node));
}

function getButton() {
  const button = container?.querySelector<HTMLButtonElement>("button");
  if (!button) throw new Error("Could not find navigation button");
  return button;
}

function clickButton() {
  act(() => getButton().click());
}
