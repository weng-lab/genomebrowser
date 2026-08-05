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
    expect(getComputedStyle(getFieldRow(title)).flexWrap).toBe("nowrap");
    expect(getComputedStyle(title.closest(".MuiFormControl-root") as HTMLElement).flex).toBe(
      "1 1 0px",
    );
    expect(getComputedStyle(color.closest(".MuiFormControl-root") as HTMLElement).minWidth).toBe(
      "0",
    );
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
    expect(getComputedStyle(heightField as HTMLElement).flex).toBe("1 1 0px");
    expect(getComputedStyle(heightField as HTMLElement).width).toBe("100%");
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

  it("commits valid colors and surfaces rejected mutations", () => {
    const updateBase = vi
      .fn<(partial: Partial<TrackBase>) => TrackMutationResult>()
      .mockReturnValueOnce({ ok: false, error: "Core rejected this color." })
      .mockReturnValueOnce({ ok: true });
    mount(
      <TrackBaseSettings base={base} displayOptions={["full", "dense"]} updateBase={updateBase} />,
    );

    updateInput(getInput("Color"), "#abcdef");
    blurInput("Color");
    updateInput(getSelectInput(), "dense");

    expect(updateBase).toHaveBeenNthCalledWith(1, { color: "#ABCDEF" });
    expect(updateBase).toHaveBeenNthCalledWith(2, { display: "dense" });
    expect(getInput("Color").getAttribute("aria-invalid")).toBe("true");
    expect(container?.textContent).toContain("Core rejected this color.");
  });

  it("uses a required neutral display fallback without materializing a missing base color", () => {
    const updateBase = vi.fn<(partial: Partial<TrackBase>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    mount(
      <TrackBaseSettings
        base={{ ...base, color: undefined }}
        displayOptions={["full", "dense"]}
        updateBase={updateBase}
      />,
    );

    const color = getInput("Color");
    expect(color.value).toBe("#000000");
    expect(color.required).toBe(true);
    blurInput("Color");
    const opener = getButton("Open Color color picker");
    act(() => opener.click());
    const saturation = getSlider("Color saturation");
    act(() =>
      saturation.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })),
    );
    expect(updateBase).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);

    updateInput(color, "#a1b2c3");
    blurInput("Color");
    expect(updateBase).toHaveBeenCalledWith({ color: "#A1B2C3" });
  });

  it("preserves a core-valid legacy base color until it is replaced", () => {
    const updateBase = vi.fn<(partial: Partial<TrackBase>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    mount(
      <TrackBaseSettings
        base={{ ...base, color: "rebeccapurple" }}
        displayOptions={["full", "dense"]}
        updateBase={updateBase}
      />,
    );

    expect(getInput("Color").value).toBe("rebeccapurple");
    const opener = getButton("Open Color color picker");
    act(() => opener.click());
    expect(document.body.textContent).toContain("Selected color: #000000");
    const saturation = getSlider("Color saturation");
    act(() =>
      saturation.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })),
    );
    expect(updateBase).not.toHaveBeenCalled();
    expect(getInput("Color").value).toBe("rebeccapurple");

    updateInput(getInput("Color"), "#123456");
    blurInput("Color");
    expect(updateBase).toHaveBeenCalledWith({ color: "#123456" });
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

function getButton(name: string) {
  const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === name,
  );
  if (!button) throw new Error(`Could not find button named ${name}`);
  return button;
}

function getSlider(name: string) {
  const slider = Array.from(
    document.body.querySelectorAll<HTMLInputElement>('input[type="range"]'),
  ).find((candidate) => candidate.getAttribute("aria-label") === name);
  if (!slider) throw new Error(`Could not find slider named ${name}`);
  return slider;
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

function blurInput(label: string) {
  act(() => getInput(label).dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
}
