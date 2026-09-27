// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GenomeBrowser } from "../../src/browser/GenomeBrowser";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.restoreAllMocks();
});

async function renderBrowser(height: number) {
  const module = defineTrackModule({
    type: "title-pan-test",
    configSchema: z.object({}),
    fetch: async () => null,
    settingsComponent: () => <div>Track settings</div>,
    render: { full: () => <rect width={500} height={height} /> },
  });
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 1_000, end: 2_000 },
    trackWidth: 500,
    marginWidth: 120,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: ["First", "Second"].map((title) =>
      module.create({ base: { id: title, title, height }, config: {} }),
    ),
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
    ),
  );
  const svg = container.querySelector("svg")!;
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
  return { browserStore, trackStore };
}

function titleElement() {
  return Array.from(container!.querySelectorAll("text")).find(
    (element) => element.textContent === "First (full)",
  )!;
}

async function pointer(target: Element, type: string, clientX: number, button = 0) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button });
  Object.assign(event, { pointerId: 1, isPrimary: true });
  await act(async () => target.dispatchEvent(event));
}

async function dragTitle(delta: number, target: Element = titleElement(), button = 0) {
  const group = target.parentElement!;
  Object.assign(group, {
    hasPointerCapture: () => false,
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  });
  await pointer(target, "pointerdown", 370, button);
  await pointer(target, "pointermove", 370 + delta, button);
  await pointer(target, "pointerup", 370 + delta, button);
}

describe("track title panning", () => {
  it.each([10, 80])("pans both directions from title text on a %spx track", async (height) => {
    const { browserStore, trackStore } = await renderBrowser(height);
    await dragTitle(-50);
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 1100, end: 2100 });
    await dragTitle(50);
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 1000, end: 2000 });
    expect(trackStore.getState().order).toEqual(["First", "Second"]);
  });

  it("pans from blank title space without moving the title", async () => {
    const { browserStore } = await renderBrowser(10);
    const title = titleElement();
    const titlePosition = title.getAttribute("x");
    await dragTitle(-50, title.parentElement!.querySelector("rect")!);
    expect(browserStore.getState().region.start).toBe(1100);
    expect(title.getAttribute("x")).toBe(titlePosition);
  });

  it("ignores right-button and below-threshold title drags", async () => {
    const { browserStore } = await renderBrowser(10);
    await dragTitle(50, titleElement(), 2);
    await dragTitle(5);
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 1000, end: 2000 });
  });

  it.each([
    ["pointercancel", false],
    ["lostpointercapture", false],
    ["blur", false],
    ["pointercancel", true],
    ["lostpointercapture", true],
    ["blur", true],
  ])("restores the title cursor after %s, captured: %s", async (end, captured) => {
    const { browserStore } = await renderBrowser(10);
    const title = titleElement();
    const group = title.parentElement!;
    let held = false;
    const release = vi.fn(() => {
      held = false;
    });
    Object.assign(group, {
      hasPointerCapture: () => held,
      setPointerCapture: () => {
        held = true;
      },
      releasePointerCapture: release,
    });
    const transforms = () =>
      Array.from(container!.querySelectorAll<SVGGElement>("g[transform]"), (node) =>
        node.getAttribute("transform"),
      );
    const before = transforms();
    await pointer(title, "pointerdown", 370);
    expect(group.style.cursor).toBe("grabbing");
    await pointer(title, "pointermove", captured ? 340 : 365);
    expect(transforms()).not.toEqual(before);
    if (end === "blur") await act(async () => window.dispatchEvent(new Event("blur")));
    else await pointer(title, end, captured ? 340 : 365);
    expect(group.style.cursor).toBe("grab");
    expect(transforms()).toEqual(before);
    expect(browserStore.getState().region.start).toBe(1_000);
    expect(release).toHaveBeenCalledTimes(captured ? 1 : 0);
    await pointer(title, "pointerdown", 370);
    await pointer(title, "pointerup", 320);
    expect(browserStore.getState().region.start).toBe(1_100);
  });

  it("recovers the cursor when pointer capture acquisition fails", async () => {
    const { browserStore } = await renderBrowser(10);
    const title = titleElement();
    const group = title.parentElement!;
    Object.assign(group, {
      hasPointerCapture: () => false,
      setPointerCapture: () => {
        throw new Error("capture denied");
      },
      releasePointerCapture: vi.fn(),
    });
    await pointer(title, "pointerdown", 370);
    expect(group.style.cursor).toBe("grabbing");
    await pointer(title, "pointermove", 340);
    expect(group.style.cursor).toBe("grab");
    expect(browserStore.getState().region.start).toBe(1_000);
  });

  it("keeps the active cursor for unrelated pointers and ignores invalid starts", async () => {
    const { browserStore } = await renderBrowser(10);
    const title = titleElement();
    const group = title.parentElement!;
    Object.assign(group, {
      hasPointerCapture: () => false,
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    });
    const send = async (
      type: string,
      x: number,
      pointerId: number,
      isPrimary = true,
      button = 0,
    ) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, button });
      Object.assign(event, { pointerId, isPrimary });
      await act(async () => title.dispatchEvent(event));
    };
    await send("pointerdown", 370, 1, false);
    await send("pointerdown", 370, 1, true, 2);
    expect(group.style.cursor).toBe("grab");
    await send("pointerdown", 370, 1);
    expect(group.style.cursor).toBe("grabbing");
    await send("pointerdown", 370, 2);
    await send("pointerup", 320, 2);
    await send("lostpointercapture", 320, 2);
    expect(group.style.cursor).toBe("grabbing");
    await send("pointerup", 320, 1);
    expect(group.style.cursor).toBe("grab");
    expect(browserStore.getState().region.start).toBe(1_100);
  });

  it("allows a short click and suppresses the click after a committed pan", async () => {
    await renderBrowser(10);
    const title = titleElement();
    const group = title.parentElement!;
    Object.assign(group, {
      hasPointerCapture: () => false,
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    });
    await pointer(title, "pointerdown", 370);
    await pointer(title, "pointerup", 375);
    const shortClick = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => title.dispatchEvent(shortClick));
    expect(shortClick.defaultPrevented).toBe(false);
    await pointer(title, "pointerdown", 370);
    await pointer(title, "pointerup", 320);
    const dragClick = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => title.dispatchEvent(dragClick));
    expect(dragClick.defaultPrevented).toBe(true);
  });

  it("keeps settings and reorder controls outside the pan area", async () => {
    const { browserStore, trackStore } = await renderBrowser(10);
    const settings = container!.querySelector('[aria-label="Settings for First"]')!;
    await pointer(settings, "pointerdown", 20);
    await pointer(settings, "pointermove", 70);
    await pointer(settings, "pointerup", 70);
    await act(async () => settings.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container!.textContent).toContain("Track settings");
    const controls = settings.parentElement!;
    const moveToBottom = controls.children[2];
    await act(async () => moveToBottom.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(trackStore.getState().order).toEqual(["Second", "First"]);
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 1000, end: 2000 });
  });
});
