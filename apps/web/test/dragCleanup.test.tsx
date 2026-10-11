// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { Workspace } from "../components/workspace/Workspace";
import { WorkspacePage } from "../components/workspace/WorkspacePage";
import { setTestPathname } from "./workspaceFixture";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let originalBodyStyle: string | null;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  if (originalBodyStyle === null) document.body.removeAttribute("style");
  else if (originalBodyStyle !== undefined) document.body.setAttribute("style", originalBodyStyle);
  vi.unstubAllGlobals();
});

function setup() {
  setTestPathname("/home");
  originalBodyStyle = document.body.getAttribute("style");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <Workspace navigation={[]}>
        <WorkspacePage title="Home" left={{ title: "Projects", children: <p>Projects</p> }}>
          <p>Home</p>
        </WorkspacePage>
      </Workspace>,
    ),
  );
  const handle = container.querySelector<HTMLElement>(
    '[role="separator"][aria-controls="left-panel"]',
  )!;
  let captured = false;
  // Scope the jsdom capture adapter to this handle, leaving the prototype untouched.
  const release = vi.fn<() => void>(() => {
    captured = false;
    pointer(handle, "lostpointercapture");
  });
  Object.assign(handle, {
    setPointerCapture: () => {
      captured = true;
    },
    hasPointerCapture: () => captured,
    releasePointerCapture: release,
  });
  return { handle, release };
}

function pointer(handle: HTMLElement, type: string, clientX = 240, pointerId = 1) {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX });
  Object.defineProperty(event, "pointerId", { value: pointerId });
  act(() => handle.dispatchEvent(event));
}

it.each(["pointerup", "pointercancel", "lostpointercapture", "blur", "unmount"])(
  "restores body inline values and priority after %s and cancels queued resizing",
  (ending) => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 16;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn<(callback: FrameRequestCallback) => number>((callback) => {
        const id = ++nextFrame;
        frames.set(id, callback);
        return id;
      }),
    );
    const cancel = vi.fn<(id: number) => boolean>((id) => frames.delete(id));
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const paintFrame = () =>
      act(() => {
        // Snapshot the queue: callbacks can schedule work for the next frame.
        const pending = [...frames];
        for (const [id, callback] of pending) {
          frames.delete(id);
          callback(0);
        }
      });
    const { handle, release } = setup();
    paintFrame();
    paintFrame();
    document.body.style.setProperty("cursor", "crosshair", "important");
    document.body.style.setProperty("user-select", "text", "important");

    pointer(handle, "pointerdown");
    expect(document.body.style.cursor).toBe("col-resize");
    expect(document.body.style.userSelect).toBe("none");
    pointer(handle, "pointermove", 320);
    const dragFrame = nextFrame;
    expect(handle.getAttribute("aria-valuenow")).toBe("240");

    if (ending === "unmount") {
      act(() => root?.unmount());
      root = undefined;
    } else if (ending === "blur") {
      act(() => window.dispatchEvent(new Event("blur")));
    } else pointer(handle, ending, 300);

    expect(cancel).toHaveBeenCalledWith(dragFrame);
    expect(frames.has(dragFrame)).toBe(false);
    paintFrame();
    paintFrame();
    expect(frames.size).toBe(0);
    expect(release).toHaveBeenCalledTimes(1);
    expect(document.body.style.getPropertyValue("cursor")).toBe("crosshair");
    expect(document.body.style.getPropertyPriority("cursor")).toBe("important");
    expect(document.body.style.getPropertyValue("user-select")).toBe("text");
    expect(document.body.style.getPropertyPriority("user-select")).toBe("important");
    expect(handle.getAttribute("aria-valuenow")).toBe(ending === "pointerup" ? "300" : "240");
    if (ending !== "unmount") pointer(handle, "pointermove", 400);
    expect(frames.size).toBe(0);
  },
);

it("removes temporary body properties and ignores interruption from another pointer", () => {
  const { handle } = setup();
  document.body.style.removeProperty("cursor");
  document.body.style.removeProperty("user-select");
  pointer(handle, "pointerdown");
  pointer(handle, "pointercancel", 240, 2);
  expect(document.body.style.cursor).toBe("col-resize");
  pointer(handle, "pointercancel");
  expect(document.body.style.getPropertyValue("cursor")).toBe("");
  expect(document.body.style.getPropertyValue("user-select")).toBe("");
});
