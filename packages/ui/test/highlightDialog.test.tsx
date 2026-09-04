// @vitest-environment jsdom

import { createBrowserStore, type BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HighlightDialog } from "../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const assembly = { id: "test", chromosomes: { chr1: 1_000, chr2: 2_000 } };

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("HighlightDialog", () => {
  it("adds a highlight from one parsed region field", () => {
    const browserStore = createTestStore();
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);

    clickButton("Add New Highlight");
    setTextInput("ID", "Focus region");
    setTextInput("Region", "chr2:1,200-1,500");
    setTextInput("Opacity (%)", "65");
    clickButton("Add Highlight");

    expect(browserStore.getState().highlights).toEqual([
      {
        id: "Focus region",
        region: { chromosome: "chr2", start: 1_200, end: 1_500 },
        color: "#3366cc",
        opacity: 0.65,
      },
    ]);
    expect(document.body.textContent).toContain("chr2:1,200-1,500");
    expect(getInput("Opacity (%)").value).toBe("20");
  });

  it("shows a field error instead of adding an invalid region", () => {
    const browserStore = createTestStore();
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);

    clickButton("Add New Highlight");
    setTextInput("ID", "Invalid region");
    setTextInput("Region", "chr2:2000-3000");
    clickButton("Add Highlight");

    expect(browserStore.getState().highlights).toEqual([]);
    expect(document.body.textContent).toContain("Region does not overlap chromosome");
  });

  it("uses the current browser region and removes existing highlights", () => {
    const browserStore = createTestStore();
    browserStore.getState().addHighlight({
      id: "Existing",
      region: { chromosome: "chr2", start: 20, end: 40 },
      color: "#ff0000",
    });
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);

    clickButton("Add New Highlight");
    clickButton("Use Current Region");
    expect(getInput("Region").value).toBe("chr1:100-200");

    clickButton("Remove Existing");
    expect(browserStore.getState().highlights).toEqual([]);
    expect(document.body.textContent).toContain("No highlights added.");
  });

  it("sets the browser to the exact highlight region", () => {
    const browserStore = createTestStore();
    browserStore.getState().addHighlight({
      id: "Target",
      region: { chromosome: "chr2", start: 300, end: 450 },
      color: "#00aa66",
    });
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);

    clickButton("Go to Target");

    expect(browserStore.getState().region).toEqual({ chromosome: "chr2", start: 300, end: 450 });
  });
});

function createTestStore(): BrowserStoreInstance {
  return createBrowserStore({
    assembly,
    region: { chromosome: "chr1", start: 100, end: 200 },
  });
}

function mount(node: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
}

function getInput(label: string) {
  const input = Array.from(document.body.querySelectorAll<HTMLInputElement>("input")).find(
    (candidate) => candidate.labels?.[0]?.textContent?.startsWith(label),
  );
  if (!input) throw new Error(`Could not find input labeled ${label}`);
  return input;
}

function setTextInput(label: string, value: string) {
  const input = getInput(label);
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  act(() => input.dispatchEvent(new Event("input", { bubbles: true })));
}

function clickButton(name: string) {
  const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) =>
      candidate.textContent?.trim() === name || candidate.getAttribute("aria-label") === name,
  );
  if (!button) throw new Error(`Could not find button named ${name}`);
  act(() => button.click());
}
