// @vitest-environment jsdom

import { createBrowserStore } from "@weng-lab/genomebrowser";
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import {
  ControlToolbar,
  RegionControls,
  NavigationControls,
  InteractionControls,
  ManagementControls,
  type ControlToolbarProps,
} from "../src/lib";

const searchProps = vi.hoisted(() => ({
  current: undefined as
    | ComponentProps<typeof import("@weng-lab/ui-components").GenomeSearch>
    | undefined,
}));
vi.mock("@weng-lab/ui-components", () => ({
  GenomeSearch: (props: NonNullable<typeof searchProps.current>) => {
    searchProps.current = props;
    return (
      <button
        onClick={() =>
          props.onSearchSubmit({ domain: { chromosome: "chr1", start: 40, end: 60 } } as Parameters<
            typeof props.onSearchSubmit
          >[0])
        }
      >
        Submit test result
      </button>
    );
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

function mount(props: Partial<ControlToolbarProps> = {}) {
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 100 } },
    region: { chromosome: "chr1", start: 20, end: 40 },
    trackWidth: 500,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <ControlToolbar
        browserStore={browserStore}
        search={{ assembly: "mm10", graphqlUrl: "/custom-search", queries: ["Coordinate"] }}
        {...props}
      />,
    ),
  );
  return browserStore;
}

function click(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (element) => element.getAttribute("aria-label") === label || element.textContent === label,
  );
  expect(button).toBeDefined();
  act(() => button!.click());
}

it("connects pan and search to the provided store and forwards host search configuration", () => {
  const store = mount();
  click("Pan right");
  expect(store.getState().region).toEqual({ chromosome: "chr1", start: 25, end: 45 });
  click("Edit region chr1:25-45");
  expect(searchProps.current).toMatchObject({
    assembly: "mm10",
    graphqlUrl: "/custom-search",
    queries: ["Coordinate"],
  });
  click("Submit test result");
  expect(store.getState().region).toEqual({ chromosome: "chr1", start: 40, end: 60 });
  expect(container.textContent).toContain("chr1:40-60");
});

it("omits management controls without callbacks", () => {
  mount();
  expect(container.textContent).not.toContain("Manage");
});

it("shows only supplied management actions and calls the host", () => {
  const onSelectTracks = vi.fn();
  mount({ onSelectTracks });
  click("Tracks");
  expect(onSelectTracks).toHaveBeenCalledOnce();
  expect(container.textContent).not.toContain("Highlights");
});

it.each(["Pan magnitude", "Zoom magnitude"])(
  "hides the %s tooltip while its options are open",
  async (label) => {
    vi.useFakeTimers();
    try {
      mount();
      const select = container.querySelector<HTMLElement>(
        `[role="combobox"][aria-label="${label}"]`,
      )!;
      expect(select).not.toBeNull();
      await act(async () => {
        select.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
      await act(async () => {
        select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
      const option = document.querySelector<HTMLElement>('[role="option"]')!;
      act(() => option.click());
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  },
);

it("composes standalone sections without a toolbar and isolates stores", () => {
  const first = mount();
  const second = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 100 } },
    region: { chromosome: "chr1", start: 60, end: 80 },
    trackWidth: 500,
  });
  const onManageHighlights = vi.fn();
  act(() =>
    root.render(
      <div>
        <ManagementControls onManageHighlights={onManageHighlights} />
        <InteractionControls browserStore={first} />
        <NavigationControls browserStore={first} />
        <RegionControls
          browserStore={second}
          search={{ assembly: "mm10", graphqlUrl: "/custom-search", queries: ["Coordinate"] }}
        />
      </div>,
    ),
  );
  expect(container.querySelector('[aria-label="Genome browser controls"]')).toBeNull();
  click("Pan right");
  expect(first.getState().region).toEqual({ chromosome: "chr1", start: 25, end: 45 });
  expect(second.getState().region).toEqual({ chromosome: "chr1", start: 60, end: 80 });
  click("Highlight");
  expect(first.getState().selectionMode).toBe("highlight");
  expect(second.getState().selectionMode).toBe("pan");
  click("Edit region chr1:60-80");
  click("Submit test result");
  expect(second.getState().region).toEqual({ chromosome: "chr1", start: 40, end: 60 });
  expect(first.getState().region).toEqual({ chromosome: "chr1", start: 25, end: 45 });
  click("Highlights");
  expect(onManageHighlights).toHaveBeenCalledOnce();
});

it("places host actions inside navigation and management groups", () => {
  const recenter = vi.fn();
  const selectBlock = vi.fn();
  mount({
    navigationActions: <button onClick={recenter}>Recenter</button>,
    managementActions: <button onClick={selectBlock}>Select LD Block</button>,
  });
  const group = (title: string) =>
    [...container.querySelectorAll("fieldset")].find(
      (element) => element.querySelector("legend")?.textContent === title,
    );
  expect(group("Navigate")?.textContent).toContain("Recenter");
  expect(group("Manage")?.textContent).toContain("Select LD Block");
  click("Recenter");
  click("Select LD Block");
  expect(recenter).toHaveBeenCalledOnce();
  expect(selectBlock).toHaveBeenCalledOnce();
});

it("keeps rejected searches open and reports the validation error", () => {
  const store = mount();
  click("Edit region chr1:20-40");
  const editor = container.querySelector("[aria-label='Cancel region search']");
  const domain = { chromosome: "chrUnknown", start: 40, end: 60 };
  const rejected = store.getState().setRegion(domain);
  expect(rejected.ok).toBe(false);
  act(() =>
    searchProps.current!.onSearchSubmit({ domain } as Parameters<
      NonNullable<typeof searchProps.current>["onSearchSubmit"]
    >[0]),
  );
  expect(container.querySelector("[aria-label='Cancel region search']")).toBe(editor);
  expect(store.getState().region).toEqual({ chromosome: "chr1", start: 20, end: 40 });
  if (!rejected.ok) expect(container.textContent).toContain(rejected.error);
  click("Submit test result");
  expect(store.getState().region).toEqual({ chromosome: "chr1", start: 40, end: 60 });
  expect(container.querySelector("[aria-label='Cancel region search']")).toBeNull();
});

it("lets Escape reach the host when closed and consumes it only while editing", async () => {
  vi.useFakeTimers();
  try {
    mount();
    const hostKeyDown = vi.fn();
    document.addEventListener("keydown", hostKeyDown);
    try {
      const copy = container.querySelector<HTMLButtonElement>(
        "[aria-label='Copy current region']",
      )!;
      act(() => {
        copy.focus();
        copy.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(32);
      });
      expect(hostKeyDown).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(copy);
      click("Edit region chr1:20-40");
      const cancel = container.querySelector<HTMLButtonElement>(
        "[aria-label='Cancel region search']",
      )!;
      act(() => {
        cancel.focus();
        cancel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(32);
      });
      expect(hostKeyDown).toHaveBeenCalledOnce();
      expect(container.querySelector("[aria-label='Cancel region search']")).toBeNull();
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Edit region chr1:20-40");
    } finally {
      document.removeEventListener("keydown", hostKeyDown);
    }
  } finally {
    vi.useRealTimers();
  }
});
