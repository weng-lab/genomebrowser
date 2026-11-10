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
const start = { chromosome: "chr11", start: 5_225_000, end: 5_305_000 };

beforeEach(() => {
  server = installSessionServer();
  server.remoteControl.set("user_alice", false);
  const saved = snapshot(createStores("hg38")!);
  id = server.add("Session", { ...saved, browser: { ...saved.browser, region: start } });
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

const saved = () => server.stored.get(id)!.snapshot.browser;
const cards = () => [...container!.querySelectorAll('[aria-label="Saved regions"] li')];

async function click(element: Element | null | undefined) {
  await act(async () => (element as HTMLElement).click());
}

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function chooseAction(region: string, action: string) {
  await click(document.querySelector(`[aria-label="Actions for region ${region}"]`));
  await click(
    [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent === action),
  );
}

it("saves, edits, hides, visits, and deletes regions, saving them with the session", async () => {
  await act(async () => root!.render(<WorkspaceApp />));
  const save = await vi.waitFor(() => {
    const button = [...container!.querySelectorAll("#left-panel button")].find(
      (button) => button.textContent === "Save current region",
    );
    expect(button).toBeDefined();
    return button;
  });

  await click(save);
  expect(cards().map((card) => card.textContent)).toEqual(["Region 1chr11:5,225,001-5,305,000"]);
  expect(cards()[0].querySelector('[aria-current="location"]')).not.toBeNull();
  await vi.waitFor(() =>
    expect(saved().highlights).toEqual([
      expect.objectContaining({ id: "Region 1", region: start, type: "filled" }),
    ]),
  );

  await chooseAction("Region 1", "Edit region");
  const field = (label: string) =>
    document.getElementById(
      [...document.querySelectorAll('[role="dialog"] label')]
        .find((element) => element.textContent?.startsWith(label))!
        .getAttribute("for")!,
    ) as HTMLInputElement;
  await type(field("ID"), "HS2");
  await type(field("Region"), "chr11:5,280,601-5,281,000");
  await type(field("Color"), "#ff0000");
  await type(field("Opacity"), "50");
  await act(async () => field("ID").form!.requestSubmit());
  const hs2 = { chromosome: "chr11", start: 5_280_600, end: 5_281_000 };
  expect(cards().map((card) => card.textContent)).toEqual(["HS2chr11:5,280,601-5,281,000"]);
  expect(cards()[0].querySelector('[aria-current="location"]')).toBeNull();
  await vi.waitFor(() =>
    expect(saved().highlights).toEqual([
      { id: "HS2", region: hs2, color: "#ff0000", opacity: 0.5, type: "filled" },
    ]),
  );

  await chooseAction("HS2", "Hide highlight");
  expect(cards()[0].textContent).toContain("Hidden");
  await vi.waitFor(() =>
    expect(saved().highlights).toEqual([
      { id: "HS2", region: hs2, color: "#ff0000", opacity: 0, type: "filled" },
    ]),
  );

  await click(cards()[0].querySelector("[role='button']"));
  expect(cards()[0].querySelector('[aria-current="location"]')).not.toBeNull();
  await vi.waitFor(() => expect(saved().region).toEqual(hs2));

  await chooseAction("HS2", "Delete");
  expect(cards()).toEqual([]);
  await vi.waitFor(() => expect(saved().highlights).toEqual([]));

  await click(save);
  await click(save);
  await vi.waitFor(() => expect(saved().highlights).toHaveLength(2));
  await click(button(container!, "Delete all regions"));
  await click(button(document.querySelector('[role="dialog"]')!, "Delete all"));
  expect(cards()).toEqual([]);
  await vi.waitFor(() => expect(saved().highlights).toEqual([]));
});

function button(within: ParentNode, label: string) {
  return [...within.querySelectorAll("button")].find((button) => button.textContent === label);
}
