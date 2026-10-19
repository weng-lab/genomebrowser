// @vitest-environment jsdom

// Import first: it mocks the Next.js router before the app's modules load.
import { route, stubLayout, WorkspaceApp } from "./workspaceApp";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { snapshot } from "../features/sessions/storeSnapshot";
import { installSessionServer, type SessionServer } from "./sessionServer";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let server: SessionServer;
let id: string;

beforeEach(() => {
  server = installSessionServer();
  id = server.add("Session", snapshot(createStores("hg38")!));
  route.reset(`/browser/${id}`);
  stubLayout();
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

async function mount() {
  await act(async () => root!.render(<WorkspaceApp />));
  await vi.waitFor(() => expect(browserText()).toContain("GENCODE 50 basic"));
}

function browserText() {
  return [...container!.querySelectorAll("main svg")].map((svg) => svg.textContent).join("");
}

it("retains browser edits across pages and restores the saved session on a new Workspace mount", async () => {
  await mount();
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

  for (const label of ["Collections", "Settings"]) {
    await act(async () =>
      container!.querySelector<HTMLAnchorElement>(`nav a[aria-label="${label}"]`)!.click(),
    );
    expect(container!.querySelector('nav [aria-current="page"]')?.getAttribute("aria-label")).toBe(
      label,
    );
  }
  // The Browser link returns to the open session.
  await act(async () =>
    container!.querySelector<HTMLAnchorElement>('nav a[aria-label="Browser"]')!.click(),
  );
  await vi.waitFor(() => expect(route.pathname()).toBe(`/browser/${id}`));
  expect(browserText()).toContain("Retained coordinates");
  expect(ticks(browserText())).toEqual(ticks(editedText));
  await vi.waitFor(() =>
    expect(container!.querySelector('main [role="status"]')?.textContent).toBe("Saved"),
  );

  await act(async () => root!.render(null));
  await mount();
  expect(browserText()).toContain("Retained coordinates");
  expect(ticks(browserText())).toEqual(ticks(editedText));
});
