// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Workspace } from "../components/workspace/Workspace";
import { BrowserSessionProvider } from "../browser/BrowserSession";
import { BrowserPage } from "../app/(workspace)/browser/BrowserPage";
import { BrowserServer } from "../browser/BrowserServer";
import CollectionsPage from "../app/(workspace)/collections/page";
import SettingsPage from "../app/(workspace)/settings/page";
import { navigation } from "../app/(workspace)/navigation";

const route = vi.hoisted(() => ({ pathname: "/browser", navigate: (_href: string) => {} }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        route.navigate(href);
      }}
    >
      {children}
    </a>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function TestShell() {
  const [pathname, setPathname] = useState("/browser");
  route.pathname = pathname;
  route.navigate = setPathname;
  return (
    <BrowserSessionProvider>
      <BrowserServer sessionId="local">
        <Workspace navigation={navigation}>
          {pathname === "/browser" ? (
            <BrowserPage sessionId="local" />
          ) : pathname === "/collections" ? (
            <CollectionsPage />
          ) : (
            <SettingsPage />
          )}
        </Workspace>
      </BrowserServer>
    </BrowserSessionProvider>
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function browserText() {
  return [...container!.querySelectorAll("main svg")].map((svg) => svg.textContent).join("");
}

it("retains browser edits across pages and starts fresh on a new Workspace mount", async () => {
  await act(async () => root!.render(<TestShell />));
  const initialText = browserText();
  expect(initialText).toContain("Coordinates");
  expect(initialText).toContain("GENCODE 50 basic");
  expect(initialText).toContain("Human cCREs");

  await act(async () =>
    container!
      .querySelector('[aria-label="Settings for Coordinates"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  const titleLabel = [...document.querySelectorAll("dialog label")].find((label) =>
    label.textContent?.startsWith("Title"),
  )!;
  const titleInput = document.getElementById(titleLabel.getAttribute("for")!) as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      titleInput,
      "Retained coordinates",
    );
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () =>
    titleInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  await act(async () =>
    document.querySelector<HTMLButtonElement>('[aria-label="Close settings"]')!.click(),
  );
  expect(browserText()).toContain("Retained coordinates");

  // jsdom lacks SVG coordinate and pointer capture APIs; supply the browser API contracts.
  const svg = [...container!.querySelectorAll<SVGSVGElement>("main svg")].find((svg) =>
    svg.textContent?.includes("Retained coordinates"),
  )!;
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
  const title = [...svg.querySelectorAll("text")].find((text) =>
    text.textContent?.startsWith("Retained coordinates"),
  )!;
  Object.assign(title.parentElement!, {
    hasPointerCapture: () => false,
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  });
  for (const [type, clientX] of [
    ["pointerdown", 370],
    ["pointermove", 170],
    ["pointerup", 170],
  ] as const) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button: 0 });
    Object.assign(event, { pointerId: 1, isPrimary: true });
    await act(async () => title.dispatchEvent(event));
  }
  const editedText = browserText();
  const ticks = (text: string | null) => text?.match(/\d{1,3}(?:,\d{3})+/g)?.slice(0, 5);
  expect(ticks(editedText)).not.toEqual(ticks(initialText));

  for (const label of ["Collections", "Settings", "Browser"]) {
    await act(async () =>
      container!.querySelector<HTMLAnchorElement>(`nav a[aria-label="${label}"]`)!.click(),
    );
    expect(container!.querySelector('nav [aria-current="page"]')?.getAttribute("aria-label")).toBe(
      label,
    );
  }
  expect(browserText()).toContain("Retained coordinates");
  expect(ticks(browserText())).toEqual(ticks(editedText));

  await act(async () => root!.render(null));
  await act(async () => root!.render(<TestShell />));
  expect(browserText()).toContain("Coordinates");
  expect(browserText()).not.toContain("Retained coordinates");
  expect(ticks(browserText())).toEqual(ticks(initialText));
});
