// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DefaultSettingsModal } from "../../src/browser/settings/DefaultSettingsModal";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { bigWigModule } from "../../src/tracks/bigwig/module";
import { TrackSettingsTestProvider } from "../tracks/trackSettingsTestProvider";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const track = bigWigModule.create({
  id: "test",
  title: "Test track",
  config: { url: "YOUR_URL_HERE" },
});
const trackStore = createTrackStore({ modules: [bigWigModule], tracks: [track] });

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DefaultSettingsModal", () => {
  it("uses a real normal width constrained by the viewport", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <TrackSettingsTestProvider trackId="test" trackStore={trackStore}>
          <DefaultSettingsModal closeSettings={vi.fn()} position={{ x: 0, y: 0 }} trackId="test">
            <div>Settings content</div>
          </DefaultSettingsModal>
        </TrackSettingsTestProvider>,
      );
    });

    const modal = container.querySelector("dialog");
    if (!modal) throw new Error("Could not find settings modal");

    expect(modal.style.boxSizing).toBe("border-box");
    expect(modal.style.width).toBe("550px");
    expect(modal.style.maxWidth).toBe("calc(100vw - 16px)");
    expect(modal.querySelector('button[aria-label="Close settings"]')).toBeTruthy();
    expect(modal.lastElementChild?.textContent).toBe("Settings content");
    expect(modal.lastElementChild?.getAttribute("style")).toContain("overflow-y: auto");

    const header = modal.firstElementChild as HTMLElement;
    act(() => {
      trackStore.getState().updateTrack("test", {
        base: { color: "#112233", title: "Updated track" },
      });
    });
    expect(header.textContent).toContain("Configure Updated track");
    expect(header.style.background).toBe("rgb(17, 34, 51)");
  });

  it("bounds initial, reset, dragged, and resized positions within the viewport", () => {
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 600);
    let modalWidth = 550;
    let modalHeight = 400;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const x = Number.parseFloat(this.style.left) || 0;
        const y = Number.parseFloat(this.style.top) || 0;
        return {
          bottom: y + modalHeight,
          height: modalHeight,
          left: x,
          right: x + modalWidth,
          top: y,
          width: modalWidth,
          x,
          y,
          toJSON: () => undefined,
        };
      },
    );

    const modal = renderModal({ x: 300, y: 250 });
    expect(modal.style.left).toBe("242px");
    expect(modal.style.top).toBe("192px");

    renderModal({ x: 40, y: 40 });
    expect(modal.style.left).toBe("40px");
    expect(modal.style.top).toBe("40px");

    const handle = modal.firstElementChild as HTMLElement;
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => true);
    handle.releasePointerCapture = vi.fn();
    act(() => {
      handle.dispatchEvent(pointerEvent("pointerdown", 48, 48));
      handle.dispatchEvent(pointerEvent("pointermove", 780, 580));
      handle.dispatchEvent(pointerEvent("pointerup", 780, 580));
    });
    expect(modal.style.left).toBe("242px");
    expect(modal.style.top).toBe("192px");

    renderModal({ x: 120, y: 100 });
    expect(modal.style.left).toBe("120px");
    expect(modal.style.top).toBe("100px");

    vi.stubGlobal("innerWidth", 320);
    vi.stubGlobal("innerHeight", 360);
    modalWidth = 304;
    modalHeight = 300;
    act(() => window.dispatchEvent(new Event("resize")));
    expect(modal.style.left).toBe("8px");
    expect(modal.style.top).toBe("52px");
  });
});

function renderModal(position: { x: number; y: number }) {
  if (!container) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }

  act(() => {
    root?.render(
      <TrackSettingsTestProvider trackId="test" trackStore={trackStore}>
        <DefaultSettingsModal closeSettings={vi.fn()} position={position} trackId="test">
          <div>Settings content</div>
        </DefaultSettingsModal>
      </TrackSettingsTestProvider>,
    );
  });

  const modal = container.querySelector("dialog");
  if (!modal) throw new Error("Could not find settings modal");
  return modal;
}

function pointerEvent(type: string, clientX: number, clientY: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX, clientY });
  Object.defineProperty(event, "pointerId", { value: 1 });
  return event;
}
