// @vitest-environment jsdom

import type { TrackBase, TrackMutationResult } from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrackBaseSettings } from "../src/TrackSettings/trackBaseSettings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const base: TrackBase = {
  id: "signal",
  title: "Saved title",
  display: "full",
  height: 80,
  color: "#2266aa",
};

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.useRealTimers();
});

describe("TrackBaseSettings", () => {
  it("keeps required title and height drafts visible before valid debounced updates", () => {
    vi.useFakeTimers();
    const updateBase = vi.fn<(partial: Partial<TrackBase>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    mount(
      <TrackBaseSettings base={base} displayOptions={["full", "dense"]} updateBase={updateBase} />,
    );

    const title = getInput("Title");
    const height = getInput("Height");
    updateInput(title, "");
    expect(title.value).toBe("");
    expect(container?.textContent).toContain("Enter a title.");

    updateInput(title, "Updated title");
    updateInput(height, "1.");
    act(() => vi.advanceTimersByTime(300));
    expect(updateBase).toHaveBeenCalledWith({ title: "Updated title" });
    expect(height.value).toBe("1.");
    expect(updateBase).toHaveBeenCalledTimes(1);

    updateInput(height, "100");
    act(() => vi.advanceTimersByTime(300));
    expect(updateBase).toHaveBeenLastCalledWith({ height: 100 });
  });
});

function mount(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
}

function getInput(label: string) {
  const input = Array.from(container?.querySelectorAll<HTMLInputElement>("input") ?? []).find(
    (candidate) =>
      Array.from(candidate.labels ?? []).some(
        (element) => element.textContent?.replace("*", "").trim() === label,
      ),
  );
  if (!input) throw new Error(`Could not find input labeled ${label}`);
  return input;
}

function updateInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) throw new Error("Input value setter is unavailable");
  act(() => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
