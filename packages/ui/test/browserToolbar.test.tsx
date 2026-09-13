// @vitest-environment jsdom

import { createBrowserStore } from "@weng-lab/genomebrowser";
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { BrowserToolbar, type BrowserToolbarProps } from "../src/lib";

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

function mount(props: Partial<BrowserToolbarProps> = {}) {
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
      <BrowserToolbar
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
