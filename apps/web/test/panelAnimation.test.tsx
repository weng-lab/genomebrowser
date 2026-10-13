// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Workspace } from "../components/workspace/Workspace";
import { WorkspacePage } from "../components/workspace/WorkspacePage";
import { setTestPathname } from "./workspaceFixture";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let frames: Map<number, FrameRequestCallback>;

beforeEach(() => {
  frames = new Map();
  let nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

function paintFrame() {
  act(() => {
    const pending = [...frames];
    for (const [id, callback] of pending) {
      frames.delete(id);
      callback(0);
    }
  });
}

function paintReset() {
  paintFrame();
  paintFrame();
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function render(pageId = "home") {
  if (!container) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  setTestPathname(`/${pageId}`);
  act(() =>
    root?.render(
      <Workspace navigation={[]}>
        <WorkspacePage
          key={pageId}
          title={pageId}
          left={pageId === "home" ? { title: "Items", children: null } : undefined}
        >
          {null}
        </WorkspacePage>
      </Workspace>,
    ),
  );
}

function toggle() {
  act(() =>
    container!.querySelector<HTMLButtonElement>('button[aria-controls="left-panel"]')!.click(),
  );
}

function transition() {
  return getComputedStyle(container!.querySelector("#left-panel")!).transition;
}

it("makes navigation instant during a toggle and restores CSS motion after paint", () => {
  render();
  expect(transition()).toBe("none");
  toggle();
  expect(getComputedStyle(container!.querySelector("#left-panel")!).width).toBe("0px");
  expect(transition()).toBe("none");
  toggle();
  paintReset();
  toggle();
  toggle();
  expect(transition()).toContain("width");
  render("settings");
  expect(transition()).toBe("none");
  paintFrame();
  render();
  expect(transition()).toBe("none");
  paintFrame();
  expect(transition()).toBe("none");
  paintFrame();
  expect(transition()).toContain("width");
  expect(getComputedStyle(container!.querySelector("#left-panel")!).width).toBe("240px");
});

it("keeps resizing instant and restores motion for later toggles", () => {
  render();
  paintReset();
  const handle = container!.querySelector<HTMLElement>(
    '[role="separator"][aria-controls="left-panel"]',
  )!;
  act(() => handle.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
  expect(handle.getAttribute("aria-valuenow")).toBe("480");
  expect(transition()).toBe("none");
  paintReset();
  toggle();
  toggle();
  expect(getComputedStyle(container!.querySelector("#left-panel")!).width).toBe("480px");
  expect(transition()).toContain("width");
  act(() => handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
  expect(handle.getAttribute("aria-valuenow")).toBe("240");
  expect(transition()).toBe("none");
});

it("lets CSS handle completion and cancellation during rapid toggle reversals", () => {
  render();
  paintReset();
  toggle();
  toggle();
  act(() => {
    for (const type of ["transitioncancel", "transitionend"]) {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, { propertyName: "width" });
      container!.querySelector("#left-panel")!.dispatchEvent(event);
    }
  });
  expect(transition()).toContain("width");
  toggle();
  expect(getComputedStyle(container!.querySelector("#left-panel")!).width).toBe("0px");
  expect(transition()).toContain("width");
});

it("honors live reduced-motion preferences without retaining animation state", () => {
  let reduced = true;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    get matches() {
      return reduced;
    },
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }));
  render();
  paintReset();
  toggle();
  expect(transition()).toBe("none");
  act(() => {
    reduced = false;
    listeners.forEach((listener) => listener());
  });
  expect(transition()).toContain("width");
  toggle();
  expect(transition()).toContain("width");
  act(() => {
    reduced = true;
    listeners.forEach((listener) => listener());
  });
  expect(transition()).toBe("none");
});

it("cancels pending paint callbacks when the workspace unmounts", () => {
  render();
  paintFrame();
  expect(frames.size).toBeGreaterThan(0);
  act(() => root?.unmount());
  root = undefined;
  expect(frames.size).toBe(0);
});
