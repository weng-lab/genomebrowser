// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "../src/App";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
  // The genome browser sizes itself with ResizeObserver and the container's width.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderApp(path: string) {
  window.history.replaceState(null, "", path);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<App />));
  return container;
}

it("shows the browser page with its sessions and agent panels", () => {
  const view = renderApp("/browser");

  expect(view.querySelector("header h1")?.textContent).toBe("Untitled session");
  expect(view.querySelector("#left-panel h2")?.textContent).toBe("Sessions");
  expect(view.querySelector("main svg")).not.toBeNull();
  expect(view.querySelector("#right-panel h2")?.textContent).toBe("Agent");
});

it("routes between pages through the URL", () => {
  const view = renderApp("/collections");
  const pageButton = (label: string) =>
    view.querySelector<HTMLAnchorElement>(`nav a[aria-label="${label}"]`)!;
  expect(view.querySelector("header h1")?.textContent).toBe("Collections");

  act(() => pageButton("Settings").click());
  expect(window.location.pathname).toBe("/settings");
  expect(view.querySelector("header h1")?.textContent).toBe("Settings");

  // Back and forward update the page through popstate.
  act(() => {
    window.history.replaceState(null, "", "/collections");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(view.querySelector("header h1")?.textContent).toBe("Collections");
});

it("shows the first page at the root and for unknown routes", () => {
  expect(renderApp("/").querySelector("header h1")?.textContent).toBe("Untitled session");
  act(() => root?.unmount());
  container?.remove();
  expect(renderApp("/missing").querySelector("header h1")?.textContent).toBe("Untitled session");
});
