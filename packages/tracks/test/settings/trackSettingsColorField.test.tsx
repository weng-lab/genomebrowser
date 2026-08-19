// @vitest-environment jsdom

import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrackSettingsColorField } from "../../src/settings/trackSettingsColorField";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.useRealTimers();
});

describe("TrackSettingsColorField", () => {
  it("shows a labeled required value and swatch without a clear action", () => {
    mount(
      <TrackSettingsColorField
        label="Track color"
        value="#1a2b3c"
        onCommit={() => ({ ok: true })}
      />,
    );

    expect(getInput("Track color").value).toBe("#1A2B3C");
    expect(getInput("Track color").placeholder).toBe("");
    expect(getButton("Open Track color color picker")).toBeTruthy();
    expect(getOptionalButton("Clear Track color")).toBeUndefined();
    expect(
      getComputedStyle(getButton("Open Track color color picker").firstElementChild as HTMLElement)
        .backgroundColor,
    ).toBe("rgb(26, 43, 60)");
  });

  it("commits normalized manual values only on blur or Enter and cancels drafts on Escape", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    mount(<RequiredHarness initialValue="#123456" onCommit={onCommit} />);
    const input = getInput("Track color");

    updateInput(input, "#abc");
    expect(input.value).toBe("#abc");
    expect(document.body.textContent).toContain("Enter a six-digit hexadecimal color");
    act(() => vi.advanceTimersByTime(1_000));
    expect(onCommit).not.toHaveBeenCalled();

    updateInput(input, "#a1b2c3");
    keyDown(input, "Enter");
    expect(onCommit).toHaveBeenLastCalledWith("#A1B2C3");
    expect(input.value).toBe("#A1B2C3");

    updateInput(input, "not a color");
    keyDown(input, "Escape");
    expect(input.value).toBe("#A1B2C3");

    updateInput(input, "#fedcba");
    blur(input);
    expect(onCommit).toHaveBeenLastCalledWith("#FEDCBA");
  });

  it("opens the visual controls, focuses the picker, and restores focus when closed", () => {
    mount(
      <TrackSettingsColorField
        label="Track color"
        value="#FF0000"
        onCommit={() => ({ ok: true })}
      />,
    );
    const opener = getButton("Open Track color color picker");

    click(opener);

    expect(getPicker()).toBeTruthy();
    expect(getVisualControls().classList.contains("react-colorful")).toBe(true);
    const saturation = getPickerSlider("Saturation");
    expect(document.activeElement?.classList.contains("MuiPopover-paper")).toBe(true);
    expect(saturation.getAttribute("aria-valuetext")).toContain("Saturation 100%");
    expect(getPickerSlider("Hue").getAttribute("aria-valuenow")).toBe("0");

    act(() => getPickerSlider("Hue").focus());
    keyDown(getPickerSlider("Hue"), "Escape");
    expect(document.activeElement).toBe(opener);
  });

  it("previews picker changes live and commits normalized colors", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    mount(<RequiredHarness initialValue="#FF0000" onCommit={onCommit} />);
    click(getButton("Open Track color color picker"));

    const hue = getPickerSlider("Hue");
    keyDown(hue, "ArrowRight");
    keyUp(hue, "ArrowRight");

    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenLastCalledWith("#FF4D00");
    expect(getInput("Track color").value).toBe("#FF4D00");
  });

  it("returns to the accepted color when a picker mutation is rejected", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({
      ok: false,
      error: "Core rejected this color.",
    }));
    mount(<TrackSettingsColorField label="Track color" value="#FF0000" onCommit={onCommit} />);
    click(getButton("Open Track color color picker"));

    const hue = getPickerSlider("Hue");
    keyDown(hue, "ArrowRight");
    keyUp(hue, "ArrowRight");

    expect(onCommit).toHaveBeenCalledWith("#FF4D00");
    expect(getInput("Track color").value).toBe("#FF0000");
    expect(document.body.textContent).toContain("Core rejected this color.");
    expect(getPickerSlider("Hue").getAttribute("aria-valuenow")).toBe("0");
  });

  it("synchronizes an open picker from honest external updates", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    mount(<TrackSettingsColorField label="Track color" value="#FF0000" onCommit={onCommit} />);
    click(getButton("Open Track color color picker"));

    rerender(<TrackSettingsColorField label="Track color" value="#00FF00" onCommit={onCommit} />);

    expect(getInput("Track color").value).toBe("#00FF00");
    expect(getPickerSlider("Hue").getAttribute("aria-valuenow")).toBe("120");
  });

  it("closes and blocks picker interaction when disabled while open", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    const renderField = (disabled: boolean) => (
      <TrackSettingsColorField
        disabled={disabled}
        label="Track color"
        value="#FF0000"
        onCommit={onCommit}
      />
    );
    mount(renderField(false));
    click(getButton("Open Track color color picker"));

    rerender(renderField(true));
    act(() => vi.runAllTimers());

    expect(onCommit).not.toHaveBeenCalled();
    expect(getButton("Open Track color color picker").disabled).toBe(true);
    expect(
      document.body.querySelector('[role="group"][aria-label="Track color color picker"]'),
    ).toBeNull();
  });

  it("constrains the portaled picker to the viewport", () => {
    mount(
      <TrackSettingsColorField
        label="Track color"
        value="#123456"
        onCommit={() => ({ ok: true })}
      />,
    );
    click(getButton("Open Track color color picker"));

    const paper = document.body.querySelector<HTMLElement>(".MuiPopover-paper");
    expect(getComputedStyle(paper as HTMLElement).maxWidth).toBe("calc(100vw - 16px)");
    expect(getComputedStyle(paper as HTMLElement).overflow).toBe("visible");
    expect(getComputedStyle(paper as HTMLElement).padding).toBe("0px");
    expect(getVisualControls().style.width).toBe("100%");
    expect(getVisualControls().closest("body")).toBe(document.body);
  });
});

function RequiredHarness({
  initialValue,
  onCommit,
}: {
  initialValue: string;
  onCommit: (color: string) => TrackMutationResult;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <TrackSettingsColorField
      label="Track color"
      value={value}
      onCommit={(color) => {
        const result = onCommit(color);
        if (result.ok) setValue(color);
        return result;
      }}
    />
  );
}

function mount(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
}

function rerender(node: React.ReactNode) {
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

function getButton(name: string) {
  const button = getOptionalButton(name);
  if (!button) throw new Error(`Could not find button named ${name}`);
  return button;
}

function getOptionalButton(name: string) {
  return Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.getAttribute("aria-label") === name,
  );
}

function getPicker() {
  const picker = document.body.querySelector<HTMLElement>(
    '[role="group"][aria-label="Track color color picker"]',
  );
  if (!picker) throw new Error("Could not find the color picker");
  return picker;
}

function getVisualControls() {
  const controls = getPicker().querySelector<HTMLElement>(
    '[aria-label="Track color visual color controls"]',
  );
  if (!controls) throw new Error("Could not find the visual color controls");
  return controls;
}

function getPickerSlider(label: "Hue" | "Saturation") {
  const selector =
    label === "Hue"
      ? '.react-colorful__hue [role="slider"]'
      : '.react-colorful__saturation [role="slider"]';
  const slider = getPicker().querySelector<HTMLElement>(selector);
  if (!slider) throw new Error(`Could not find picker slider ${label}`);
  return slider;
}

function updateInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) throw new Error("Input value setter is unavailable");
  valueSetter.call(input, value);
  act(() => input.dispatchEvent(new Event("input", { bubbles: true })));
}

function blur(input: HTMLInputElement) {
  act(() => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
}

function click(element: HTMLElement) {
  act(() => element.click());
}

function keyDown(element: HTMLElement, key: string) {
  dispatchKeyboardEvent(element, "keydown", key);
}

function keyUp(element: HTMLElement, key: string) {
  dispatchKeyboardEvent(element, "keyup", key);
}

function dispatchKeyboardEvent(element: HTMLElement, type: "keydown" | "keyup", key: string) {
  const event = new KeyboardEvent(type, { bubbles: true, key });
  const keyCode = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[key] ?? 0;
  Object.defineProperty(event, "keyCode", { value: keyCode });
  Object.defineProperty(event, "which", { value: keyCode });
  act(() => element.dispatchEvent(event));
}
