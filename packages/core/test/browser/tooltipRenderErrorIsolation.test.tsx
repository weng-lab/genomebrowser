// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipContextProvider } from "../../src/browser/tooltip/TooltipContext";
import { TooltipOverlay } from "../../src/browser/tooltip/TooltipOverlay";
import {
  createTooltipStore,
  type TooltipStoreInstance,
} from "../../src/browser/tooltip/tooltipStore";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const tooltipRenderErrorPrefix = "[genomebrowser] Tooltip render error";
const renderError = new Error("private tooltip exception");
const originalGetBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let store: TooltipStoreInstance;

beforeEach(async () => {
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: vi.fn(() => ({ x: 0, y: 0, width: 144, height: 30 })),
  });
  store = createTooltipStore();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <TooltipContextProvider
        isDisabled={() => false}
        getTooltipComponent={() => undefined}
        store={store}
      >
        <BrowserSurface />
      </TooltipContextProvider>,
    );
  });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.restoreAllMocks();
  if (originalGetBBox) {
    Object.defineProperty(SVGElement.prototype, "getBBox", originalGetBBox);
  } else {
    Reflect.deleteProperty(SVGElement.prototype, "getBBox");
  }
});

describe("tooltip render error isolation", () => {
  it("contains throwing content and reports safe tooltip context", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const privateItem = { secret: "private tooltip item" };

    await show("broken-owner", <ThrowingTooltip item={privateItem} />, { x: 40, y: 50 });

    const fallback = requiredText("Tooltip unavailable");
    const fallbackGroup = fallback.parentElement;
    const fallbackRect = fallbackGroup?.querySelector("rect");
    expect(fallbackRect?.getAttribute("width")).toBe("144");
    expect(fallbackRect?.getAttribute("height")).toBe("30");
    expect(container?.textContent).not.toContain(renderError.message);
    expect(requiredElement('[data-testid="track-content"]')).toBeTruthy();
    expect(requiredElement('[data-testid="browser-navigation"]')).toBeTruthy();
    expect(requiredElement('[data-testid="unrelated-overlay"]')).toBeTruthy();

    await act(async () =>
      requiredElement('[data-testid="browser-navigation"]').dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      ),
    );
    expect(requiredText("Navigation updates: 1")).toBeTruthy();
    expect(requiredText("Tooltip unavailable")).toBe(fallback);

    const customLog = consoleError.mock.calls.find(
      ([message]) => message === tooltipRenderErrorPrefix,
    );
    expect(customLog?.[1]).toEqual({
      extensionPoint: "tooltip content",
      error: renderError,
      componentStack: expect.stringContaining("ThrowingTooltip"),
    });
    expect(JSON.stringify(customLog?.[1])).not.toContain(privateItem.secret);
  });

  it("renders content from a different owner after a failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await show("broken-owner", <ThrowingTooltip item={{ secret: "hidden" }} />, {
      x: 40,
      y: 50,
    });

    await show("healthy-owner", <text>Healthy tooltip</text>, { x: 80, y: 90 });

    expect(requiredText("Healthy tooltip")).toBeTruthy();
    expect(container?.textContent).not.toContain("Tooltip unavailable");
  });

  it("recovers after the failed tooltip is hidden and shown again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await show("same-owner", <ThrowingTooltip item={{ secret: "hidden" }} />, { x: 40, y: 50 });

    await act(async () => store.getState().hide("same-owner"));
    expect(container?.textContent).not.toContain("Tooltip unavailable");

    await show("same-owner", <text>Recovered tooltip</text>, { x: 60, y: 70 });
    expect(requiredText("Recovered tooltip")).toBeTruthy();
  });

  it("does not retry failed content during same-owner movement", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const renderTooltip = vi.fn();
    await show("moving-owner", <CountingThrowingTooltip onRender={renderTooltip} />, {
      x: 40,
      y: 50,
    });
    const renderCountAfterFailure = renderTooltip.mock.calls.length;
    const reportCountAfterFailure = customReportCount(consoleError.mock.calls);

    await show("moving-owner", <CountingThrowingTooltip onRender={renderTooltip} />, {
      x: 120,
      y: 130,
    });
    await show("moving-owner", <CountingThrowingTooltip onRender={renderTooltip} />, {
      x: 140,
      y: 150,
    });

    expect(requiredText("Tooltip unavailable")).toBeTruthy();
    expect(renderTooltip).toHaveBeenCalledTimes(renderCountAfterFailure);
    expect(customReportCount(consoleError.mock.calls)).toBe(reportCountAfterFailure);
    expect(
      requiredText("Tooltip unavailable").parentElement?.parentElement?.getAttribute("transform"),
    ).toBe("translate(150,160)");
  });
});

function BrowserSurface() {
  const [navigationUpdates, setNavigationUpdates] = useState(0);

  return (
    <svg>
      <g data-testid="track-content">
        <text>Track remains available</text>
      </g>
      <g
        data-testid="browser-navigation"
        onClick={() => setNavigationUpdates((count) => count + 1)}
      >
        <rect width={20} height={20} />
        <text>Navigation updates: {navigationUpdates}</text>
      </g>
      <g data-testid="unrelated-overlay" />
      <TooltipOverlay width={500} height={300} />
    </svg>
  );
}

function ThrowingTooltip({ item: _item }: { item: { secret: string } }): never {
  throw renderError;
}

function CountingThrowingTooltip({ onRender }: { onRender: () => void }): never {
  onRender();
  throw renderError;
}

async function show(owner: string, content: React.ReactElement, anchor: { x: number; y: number }) {
  await act(async () => store.getState().show(owner, content, anchor));
}

function customReportCount(calls: unknown[][]) {
  return calls.filter(([message]) => message === tooltipRenderErrorPrefix).length;
}

function requiredText(content: string) {
  const element = Array.from(container?.querySelectorAll("text") ?? []).find(
    (candidate) => candidate.textContent === content,
  );
  if (!element) throw new Error(`Text not found: ${content}`);
  return element;
}

function requiredElement<E extends Element = Element>(selector: string) {
  const element = container?.querySelector<E>(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  return element;
}
