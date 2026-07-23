// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogGrid } from "../src/TrackSelect/catalog/catalogGrid";
import type { TrackSelectCatalog } from "../src/TrackSelect/schema/catalogSchema";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const catalog: TrackSelectCatalog = {
  id: "catalog",
  label: "Catalog",
  views: [
    {
      id: "grouped",
      label: "Grouped",
      columns: [{ field: "title" }],
      grouping: ["category", "subgroup"],
      leaf: "title",
    },
  ],
  tracks: [
    {
      id: "one",
      type: "signal",
      title: "Track one",
      config: { url: "one" },
      metadata: { category: "Group A", subgroup: "Nested A" },
    },
    {
      id: "two",
      type: "signal",
      title: "Track two",
      config: { url: "two" },
      metadata: { category: "Group A", subgroup: "Nested A" },
    },
    {
      id: "three",
      type: "signal",
      title: "Track three",
      config: { url: "three" },
      metadata: { category: "Group B", subgroup: "Nested B" },
    },
  ],
};

const view = catalog.views[0]!;
const groupALeafIds = ["catalog::one", "catalog::two"];

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

function renderGrid(initialIds: string[] = [], acceptSelection = true) {
  const onSelectionChange = vi.fn<(selectedIds: Set<string>) => void>();
  let setSelectedIds: ((selectedIds: Set<string>) => void) | undefined;

  function Harness() {
    const [selectedIds, setSelection] = useState(() => new Set(initialIds));
    setSelectedIds = setSelection;

    return (
      <CatalogGrid
        catalog={catalog}
        view={view}
        selectedIds={selectedIds}
        onSelectionChange={(nextSelectedIds) => {
          onSelectionChange(nextSelectedIds);
          if (acceptSelection) setSelection(nextSelectedIds);
        }}
      />
    );
  }

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));

  return {
    onSelectionChange,
    setSelectedIds: (ids: string[]) => {
      act(() => setSelectedIds?.(new Set(ids)));
    },
  };
}

function getRow(label: string) {
  const row = Array.from(container?.querySelectorAll<HTMLElement>('[role="row"]') ?? []).find(
    (candidate) => candidate.textContent?.includes(label),
  );
  if (!row) throw new Error(`Could not find row labeled ${label}`);
  return row;
}

function getRowCheckbox(label: string) {
  const checkbox = getRow(label).querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!checkbox) throw new Error(`Could not find checkbox for row labeled ${label}`);
  return checkbox;
}

function isIndeterminate(label: string) {
  return getRowCheckbox(label).getAttribute("data-indeterminate") === "true";
}

function lastEmittedIds(onSelectionChange: ReturnType<typeof vi.fn<(ids: Set<string>) => void>>) {
  return onSelectionChange.mock.lastCall?.[0] ?? new Set<string>();
}

function clickCheckbox(label: string) {
  act(() => getRowCheckbox(label).click());
}

function expandGroup(label: string) {
  const button = getRow(label).querySelector<HTMLButtonElement>("button");
  if (!button) throw new Error(`Could not find expansion button for row labeled ${label}`);
  act(() => button.click());
}

async function setQuickFilter(value: string) {
  let input = container?.querySelector<HTMLInputElement>('input[placeholder="Search…"]');
  if (!input) {
    const trigger = container?.querySelector<HTMLButtonElement>('button[aria-label="Search"]');
    if (!trigger) throw new Error("Could not find quick-filter trigger");
    act(() => trigger.click());
    input = container?.querySelector<HTMLInputElement>('input[placeholder="Search…"]');
  }
  if (!input) throw new Error("Could not find quick-filter input");

  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  await act(async () => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
}

describe("CatalogGrid grouped selection", () => {
  it("presents none, partial, and full descendant selection correctly at nested levels", () => {
    const grid = renderGrid();

    expect(getRowCheckbox("Group A").checked).toBe(false);
    expect(isIndeterminate("Group A")).toBe(false);

    grid.setSelectedIds(["catalog::one"]);
    expect(getRowCheckbox("Group A").checked).toBe(false);
    expect(isIndeterminate("Group A")).toBe(true);

    grid.setSelectedIds(groupALeafIds);
    expect(getRowCheckbox("Group A").checked).toBe(true);
    expect(isIndeterminate("Group A")).toBe(false);

    expandGroup("Group A");
    expect(getRowCheckbox("Nested A").checked).toBe(true);

    grid.setSelectedIds(["catalog::one"]);
    expect(getRowCheckbox("Nested A").checked).toBe(false);
    expect(isIndeterminate("Nested A")).toBe(true);
    expect(isIndeterminate("Group A")).toBe(true);
  });

  it("selects and deselects group descendants without emitting synthetic group IDs", () => {
    const grid = renderGrid();

    clickCheckbox("Group A");
    expect(lastEmittedIds(grid.onSelectionChange)).toEqual(new Set(groupALeafIds));
    expect(getRowCheckbox("Group A").checked).toBe(true);

    expandGroup("Group A");
    clickCheckbox("Nested A");
    expect(lastEmittedIds(grid.onSelectionChange)).toEqual(new Set());
    expect(getRowCheckbox("Nested A").checked).toBe(false);
    expect(getRowCheckbox("Group A").checked).toBe(false);

    clickCheckbox("Nested A");
    expect(lastEmittedIds(grid.onSelectionChange)).toEqual(new Set(groupALeafIds));
    expect(getRowCheckbox("Nested A").checked).toBe(true);
    expect(getRowCheckbox("Group A").checked).toBe(true);

    clickCheckbox("Group A");
    expect(lastEmittedIds(grid.onSelectionChange)).toEqual(new Set());
    expect(getRowCheckbox("Group A").checked).toBe(false);
  });

  it("updates nested groups after individual leaf changes", () => {
    const grid = renderGrid(groupALeafIds);
    expandGroup("Group A");
    expandGroup("Nested A");

    clickCheckbox("Track one");
    expect(lastEmittedIds(grid.onSelectionChange)).toEqual(new Set(["catalog::two"]));
    expect(isIndeterminate("Nested A")).toBe(true);
    expect(isIndeterminate("Group A")).toBe(true);

    clickCheckbox("Track one");
    expect(lastEmittedIds(grid.onSelectionChange)).toEqual(new Set(groupALeafIds));
    expect(getRowCheckbox("Nested A").checked).toBe(true);
    expect(getRowCheckbox("Group A").checked).toBe(true);
  });

  it("removes stale group selection when a filter is cleared without changing leaf IDs", async () => {
    const grid = renderGrid();
    expandGroup("Group A");
    expandGroup("Nested A");

    await setQuickFilter("Track one");
    clickCheckbox("Track one");

    expect(lastEmittedIds(grid.onSelectionChange)).toEqual(new Set(["catalog::one"]));
    expect(getRowCheckbox("Group A").checked).toBe(true);
    const callbackCount = grid.onSelectionChange.mock.calls.length;

    await setQuickFilter("");

    expect(getRowCheckbox("Group A").checked).toBe(false);
    expect(isIndeterminate("Group A")).toBe(true);
    expect(grid.onSelectionChange).toHaveBeenCalledTimes(callbackCount);
    for (const [emittedIds] of grid.onSelectionChange.mock.calls) {
      expect(emittedIds).toEqual(new Set(["catalog::one"]));
    }
  });

  it("keeps the accepted controlled presentation when a selection increase is rejected", () => {
    const grid = renderGrid([], false);

    clickCheckbox("Group A");
    expect(lastEmittedIds(grid.onSelectionChange)).toEqual(new Set(groupALeafIds));
    expect(getRowCheckbox("Group A").checked).toBe(false);
    expect(isIndeterminate("Group A")).toBe(false);
  });
});
