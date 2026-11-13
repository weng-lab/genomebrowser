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
  it("preserves the draft and displays a rejected insertion result", () => {
    const browserStore = createTestStore();
    browserStore.setState({
      addHighlight: () => ({ ok: false, code: "INVALID_HIGHLIGHT", error: "Highlight rejected." }),
    });
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);
    clickButton("Add New Highlight");
    setTextInput("Name", "Focus region");
    setTextInput("Region", "chr2:1200-1500");
    clickButton("Add Highlight");
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
      "Highlight rejected.",
    );
    expect(getInput("Name").value).toBe("Focus region");
    expect(getInput("Region").value).toBe("chr2:1200-1500");
    expect(browserStore.getState().highlights).toEqual([]);
  });
  it("shows newest highlights first without reordering the store", () => {
    const browserStore = createTestStore();
    for (const id of ["First", "Second", "Third"]) {
      browserStore
        .getState()
        .addHighlight({ id, region: { start: 100, end: 200 }, color: "#3366cc" });
    }
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);
    expect(document.body.textContent).toContain("Newest first");
    const ids = Array.from(document.body.querySelectorAll('[aria-label^="Go to "]')).map((button) =>
      button.getAttribute("aria-label"),
    );
    expect(ids).toEqual(["Go to Third", "Go to Second", "Go to First"]);
    expect(browserStore.getState().highlights.map((highlight) => highlight.id)).toEqual([
      "First",
      "Second",
      "Third",
    ]);
  });

  it("edits all highlight fields in place, keeping its ID, without changing other highlights", () => {
    const browserStore = createTestStore();
    browserStore
      .getState()
      .addHighlight({ id: "Original", region: { start: 100, end: 200 }, color: "#3366cc" });
    browserStore
      .getState()
      .addHighlight({ id: "Other", region: { start: 400, end: 500 }, color: "#ff0000" });
    const other = browserStore.getState().highlights[1];
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);

    clickButton("Edit Original");
    expect(getInput("Name").value).toBe("Original");
    expect(getInput("Region").value).toBe("chr1:101-200");
    expect(getInput("Opacity (%)").value).toBe("20");
    setTextInput("Name", "Renamed");
    setTextInput("Region", "chr2:301-450");
    setTextInput("Color", "#00aa66");
    const select = document.body.querySelector('[role="combobox"]')!;
    act(() => select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (el) => el.textContent === "Outlined",
    )!;
    act(() => option.click());
    setTextInput("Opacity (%)", "75");
    expect(browserStore.getState().highlights[0].id).toBe("Original");
    clickButton("Save changes");

    expect(browserStore.getState().highlights).toEqual([
      {
        id: "Original",
        name: "Renamed",
        region: { chromosome: "chr2", start: 300, end: 450 },
        color: "#00aa66",
        opacity: 0.75,
        type: "outlined",
      },
      other,
    ]);
    expect(browserStore.getState().highlights[1]).toBe(other);
    clickButton("Edit Renamed");
    expect(getInput("Opacity (%)").value).toBe("75");
    clickButton("Save changes");
    expect(browserStore.getState().highlights).toHaveLength(2);
    clickButton("Go to Renamed");
    expect(browserStore.getState().region).toEqual({ chromosome: "chr2", start: 300, end: 450 });
  });

  it("marks hidden highlights, keeps them hidden when edited, and shows them again", () => {
    const browserStore = createTestStore();
    browserStore.getState().addHighlight({
      id: "Hidden",
      region: { start: 100, end: 200 },
      color: "#3366cc",
      opacity: 0.5,
      hidden: true,
    });
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);
    expect(document.body.textContent).toContain("chr1:101-200 · Filled · Hidden");
    clickButton("Edit Hidden");
    expect(getInput("Hidden").checked).toBe(true);
    setTextInput("Opacity (%)", "40");
    clickButton("Save changes");
    expect(browserStore.getState().highlights[0]).toMatchObject({ opacity: 0.4, hidden: true });

    clickButton("Edit Hidden");
    act(() => getInput("Hidden").click());
    clickButton("Save changes");
    expect(browserStore.getState().highlights[0]).not.toHaveProperty("hidden");
    expect(browserStore.getState().highlights[0]).toMatchObject({ opacity: 0.4 });
    expect(document.body.textContent).toContain("chr1:101-200 · FilledAdd New Highlight");
  });

  it("retains invalid edits and cancels without modifying the highlight", () => {
    const browserStore = createTestStore();
    for (const id of ["Original", "Other"])
      browserStore
        .getState()
        .addHighlight({ id, region: { start: 100, end: 200 }, color: "#3366cc", type: "outlined" });
    const original = browserStore.getState().highlights;
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);
    clickButton("Edit Original");
    expect(getInput("Opacity (%)").value).toBe("100");
    // Names need not be unique, so only the region is rejected.
    setTextInput("Name", "Other");
    setTextInput("Region", "chr2:2001-3000");
    clickButton("Save changes");
    expect(document.body.textContent).toContain("Region does not overlap chromosome");
    expect(getInput("Name").value).toBe("Other");
    expect(browserStore.getState().highlights).toBe(original);
    clickButton("Cancel");
    clickButton("Edit Original");
    expect(getInput("Name").value).toBe("Original");
    expect(getInput("Region").value).toBe("chr1:101-200");
    clickButton("Cancel");
    clickButton("Edit Other");
    expect(getInput("Name").value).toBe("Other");
  });

  it("adds a highlight from one parsed region field", () => {
    const browserStore = createTestStore();
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);

    clickButton("Add New Highlight");
    setTextInput("Name", "Focus region");
    setTextInput("Region", "chr2:1,201-1,500");
    setTextInput("Opacity (%)", "65");
    clickButton("Add Highlight");

    expect(browserStore.getState().highlights).toEqual([
      {
        id: "chr2:1,201-1,500",
        name: "Focus region",
        region: { chromosome: "chr2", start: 1_200, end: 1_500 },
        color: "#3366cc",
        opacity: 0.65,
        type: "filled",
      },
    ]);
    expect(document.body.textContent).toContain("chr2:1,201-1,500");
    expect(getInput("Opacity (%)").value).toBe("20");
  });

  it("names a highlight by its coordinates when the name is blank", () => {
    const browserStore = createTestStore();
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);
    clickButton("Add New Highlight");
    setTextInput("Region", "chr2:1,201-1,500");
    clickButton("Add Highlight");
    setTextInput("Region", "chr2:1,201-1,500");
    clickButton("Add Highlight");
    expect(browserStore.getState().highlights.map(({ id, name }) => [id, name])).toEqual([
      ["chr2:1,201-1,500", "chr2:1,201-1,500"],
      ["chr2:1,201-1,500 (2)", "chr2:1,201-1,500 (2)"],
    ]);

    clickButton("Edit chr2:1,201-1,500 (2)");
    setTextInput("Name", "");
    setTextInput("Region", "chr2:1,301-1,400");
    clickButton("Save changes");
    expect(browserStore.getState().highlights[1]).toMatchObject({
      id: "chr2:1,201-1,500 (2)",
      name: "chr2:1,301-1,400",
    });
  });

  it("adds an outlined highlight with a visible border opacity and resets the type", () => {
    const browserStore = createTestStore();
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);
    clickButton("Add New Highlight");
    setTextInput("Name", "Outlined region");
    clickButton("Use Current Region");
    const select = document.body.querySelector('[role="combobox"]')!;
    act(() => select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (el) => el.textContent === "Outlined",
    )!;
    act(() => option.click());
    expect(getInput("Opacity (%)").value).toBe("100");
    clickButton("Add Highlight");
    expect(browserStore.getState().highlights[0]).toMatchObject({ type: "outlined", opacity: 1 });
    expect(document.body.textContent).toContain("· Outlined");
    expect(document.body.querySelector('[role="combobox"]')?.textContent).toBe("Filled");
  });

  it("shows a field error instead of adding an invalid region", () => {
    const browserStore = createTestStore();
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);

    clickButton("Add New Highlight");
    setTextInput("Name", "Invalid region");
    setTextInput("Region", "chr2:2001-3000");
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
    expect(getInput("Region").value).toBe("chr1:101-200");

    clickButton("Remove Existing");
    expect(browserStore.getState().highlights).toEqual([]);
    expect(document.body.textContent).toContain("No highlights added.");
  });

  it("removes all highlights at once after confirmation", () => {
    const browserStore = createTestStore();
    for (const id of ["First", "Second"]) {
      browserStore
        .getState()
        .addHighlight({ id, region: { start: 100, end: 200 }, color: "#3366cc" });
    }
    const highlights = browserStore.getState().highlights;
    mount(<HighlightDialog browserStore={browserStore} open onClose={vi.fn()} />);

    clickButton("Remove all");
    clickButton("Cancel", getDialog("Remove all highlights?"));
    expect(browserStore.getState().highlights).toBe(highlights);

    clickButton("Remove all");
    clickButton("Remove all", getDialog("Remove all highlights?"));
    expect(browserStore.getState().highlights).toEqual([]);
    expect(document.body.textContent).toContain("No highlights added.");
    expect(document.body.textContent).not.toContain("Remove all");
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

function getDialog(title: string) {
  const dialog = Array.from(document.body.querySelectorAll<HTMLElement>('[role="dialog"]')).find(
    (candidate) => candidate.textContent?.includes(title),
  );
  if (!dialog) throw new Error(`Could not find dialog titled ${title}`);
  return dialog;
}

function clickButton(name: string, scope: ParentNode = document.body) {
  const button = Array.from(scope.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) =>
      candidate.textContent?.trim() === name || candidate.getAttribute("aria-label") === name,
  );
  if (!button) throw new Error(`Could not find button named ${name}`);
  act(() => button.click());
}
