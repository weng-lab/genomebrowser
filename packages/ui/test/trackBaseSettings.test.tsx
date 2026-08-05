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
  it("groups base fields into two semantic rows in source order", () => {
    const updateBase = vi.fn<(partial: Partial<TrackBase>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    mount(
      <TrackBaseSettings base={base} displayOptions={["full", "dense"]} updateBase={updateBase} />,
    );

    const title = getInput("Title");
    const color = getInput("Color");
    const display = getSelect("Display mode");
    const height = getInput("Height");
    const controls = Array.from(
      container?.querySelectorAll('input:not(.MuiSelect-nativeInput), [role="combobox"]') ?? [],
    );

    expect(controls).toEqual([title, color, display, height]);
    expect(getFieldRow(title)).toBe(getFieldRow(color));
    expect(getFieldRow(display)).toBe(getFieldRow(height));
    expect(getFieldRow(title)).not.toBe(getFieldRow(display));
    expect(getComputedStyle(getFieldRow(title)).display).toBe("flex");
    expect(getComputedStyle(getFieldRow(title)).flexWrap).toBe("wrap");
  });

  it("omits a single unavailable display option without leaving a placeholder field", () => {
    const updateBase = vi.fn<(partial: Partial<TrackBase>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    mount(<TrackBaseSettings base={base} displayOptions={["full"]} updateBase={updateBase} />);

    expect(getOptionalSelect("Display mode")).toBeUndefined();
    const height = getInput("Height");
    expect(getFieldRow(height).querySelectorAll(".MuiFormControl-root")).toHaveLength(1);
    const heightField = height.closest<HTMLElement>(".MuiFormControl-root");
    expect(heightField).toBeTruthy();
    expect(getComputedStyle(heightField as HTMLElement).flexGrow).toBe("0");
    expect(getComputedStyle(heightField as HTMLElement).flexBasis).toBe("12rem");
  });

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

  it("preserves immediate color and display updates and surfaces rejected mutations", () => {
    const updateBase = vi
      .fn<(partial: Partial<TrackBase>) => TrackMutationResult>()
      .mockReturnValueOnce({ ok: true })
      .mockReturnValueOnce({ ok: false, error: "Core rejected this display mode." });
    mount(
      <TrackBaseSettings base={base} displayOptions={["full", "dense"]} updateBase={updateBase} />,
    );

    updateInput(getInput("Color"), "#abcdef");
    updateInput(getSelectInput(), "dense");

    expect(updateBase).toHaveBeenNthCalledWith(1, { color: "#abcdef" });
    expect(updateBase).toHaveBeenNthCalledWith(2, { display: "dense" });
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain(
      "Core rejected this display mode.",
    );
  });

  it("keeps title validation associated with its field", () => {
    const updateBase = vi.fn<(partial: Partial<TrackBase>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    mount(
      <TrackBaseSettings base={base} displayOptions={["full", "dense"]} updateBase={updateBase} />,
    );

    const title = getInput("Title");
    updateInput(title, "");

    const describedBy = title.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")?.textContent).toBe("Enter a title.");
    expect(updateBase).not.toHaveBeenCalled();
  });
});

function mount(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
}

function getInput(label: string) {
  const input = getOptionalInput(label);
  if (!input) throw new Error(`Could not find input labeled ${label}`);
  return input;
}

function getOptionalInput(label: string) {
  const input = Array.from(container?.querySelectorAll<HTMLInputElement>("input") ?? []).find(
    (candidate) =>
      Array.from(candidate.labels ?? []).some(
        (element) => element.textContent?.replace("*", "").trim() === label,
      ),
  );
  return input;
}

function getSelect(label: string) {
  const select = getOptionalSelect(label);
  if (!select) throw new Error(`Could not find select labeled ${label}`);
  return select;
}

function getOptionalSelect(label: string) {
  const select = container?.querySelector<HTMLElement>('[role="combobox"]');
  if (!select) return undefined;

  const labelIds = select.getAttribute("aria-labelledby")?.split(" ") ?? [];
  return labelIds.some((id) => document.getElementById(id)?.textContent?.trim() === label)
    ? select
    : undefined;
}

function getSelectInput() {
  const input = container?.querySelector<HTMLInputElement>(".MuiSelect-nativeInput");
  if (!input) throw new Error("Could not find native select input");
  return input;
}

function getFieldRow(control: Element) {
  const field = control.closest(".MuiFormControl-root");
  const row = field?.parentElement;
  if (!row) throw new Error("Could not find field row");
  return row;
}

function updateInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) throw new Error("Input value setter is unavailable");
  act(() => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
