// @vitest-environment jsdom

import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hexToHsv, hsvToHex } from "../src/TrackSettings/color";
import { TrackSettingsColorField } from "../src/TrackSettings/trackSettingsColorField";

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

describe("color conversion", () => {
  it("round-trips normalized six-digit colors through HSV", () => {
    expect(hsvToHex(hexToHsv("#1a2b3c"))).toBe("#1A2B3C");
    expect(hsvToHex({ hue: 120, saturation: 100, value: 100 })).toBe("#00FF00");
  });
});

describe("TrackSettingsColorField", () => {
  it("shows a labeled required value and swatch without a clear action", () => {
    mount(
      <TrackSettingsColorField
        label="Track color"
        mode="required"
        value="#1a2b3c"
        onCommit={() => ({ ok: true })}
      />,
    );

    expect(getInput("Track color").value).toBe("#1A2B3C");
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

    updateInput(input, "");
    blur(input);
    expect(onCommit).not.toHaveBeenCalled();

    updateInput(input, "#abc");
    expect(input.value).toBe("#abc");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")?.textContent).toContain(
      "Enter a six-digit hexadecimal color",
    );
    act(() => vi.advanceTimersByTime(1_000));
    expect(onCommit).not.toHaveBeenCalled();

    updateInput(input, "#a1b2c3");
    act(() => vi.advanceTimersByTime(1_000));
    expect(onCommit).not.toHaveBeenCalled();
    keyDown(input, "Enter");
    expect(onCommit).toHaveBeenLastCalledWith("#A1B2C3");
    expect(input.value).toBe("#A1B2C3");

    updateInput(input, "not a color");
    keyDown(input, "Escape");
    expect(input.value).toBe("#A1B2C3");
    expect(onCommit).toHaveBeenCalledTimes(1);

    updateInput(input, "#fedcba");
    blur(input);
    expect(onCommit).toHaveBeenLastCalledWith("#FEDCBA");
  });

  it("preserves an optional fallback until a picker change and clears only explicit values", () => {
    const onCommit = vi.fn<(color: string | undefined) => TrackMutationResult>(() => ({
      ok: true,
    }));
    mount(<OptionalHarness initialValue={undefined} onCommit={onCommit} />);
    const input = getInput("Signal color");

    expect(input.value).toBe("");
    expect(input.placeholder).toBe("#0A0B0C");
    expect(document.body.textContent).toContain("Using fallback #0A0B0C.");
    expect(getButton("Clear Signal color").disabled).toBe(true);

    const opener = getButton("Open Signal color color picker");
    click(opener);
    expect(getSaturationValueSurface("Signal color").getAttribute("role")).toBe("img");
    keyDown(getSlider("Signal color saturation"), "Escape");
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);

    click(opener);
    updateRange(getSlider("Signal color saturation"), "50");
    expect(onCommit).toHaveBeenCalledWith(expect.stringMatching(/^#[0-9A-F]{6}$/));

    onCommit.mockClear();
    rerender(<OptionalHarness key="explicit" initialValue="#123456" onCommit={onCommit} />);
    click(getButton("Clear Signal color"));
    expect(onCommit).toHaveBeenCalledWith(undefined);
  });

  it("shows a required display-only fallback without materializing it", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    mount(
      <TrackSettingsColorField
        fallbackColor="#000000"
        label="Track color"
        mode="required"
        value={undefined}
        onCommit={onCommit}
      />,
    );

    const input = getInput("Track color");
    expect(input.value).toBe("#000000");
    expect(input.required).toBe(true);
    blur(input);
    click(getButton("Open Track color color picker"));
    keyDown(getSlider("Track color saturation"), "Escape");
    expect(onCommit).not.toHaveBeenCalled();

    updateInput(input, "#123456");
    blur(input);
    expect(onCommit).toHaveBeenCalledWith("#123456");
  });

  it("preserves legacy controlled colors and initializes their picker from the fallback", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    mount(
      <TrackSettingsColorField
        fallbackColor="#0A0B0C"
        label="Track color"
        mode="required"
        value="rebeccapurple"
        onCommit={onCommit}
      />,
    );

    const input = getInput("Track color");
    expect(input.value).toBe("rebeccapurple");
    expect(
      getComputedStyle(getButton("Open Track color color picker").firstElementChild as HTMLElement)
        .backgroundColor,
    ).toBe("rgb(102, 51, 153)");
    const opener = getButton("Open Track color color picker");
    click(opener);
    expect(document.body.textContent).toContain("Selected color: #0A0B0C");
    keyDown(getSlider("Track color saturation"), "Escape");
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("rebeccapurple");

    click(opener);
    updateRange(getSlider("Track color brightness"), "50");
    expect(onCommit).toHaveBeenCalledWith(expect.stringMatching(/^#[0-9A-F]{6}$/));
    expect(input.value).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("preserves and clears an optional three-digit controlled color", () => {
    const onCommit = vi.fn<(color: string | undefined) => TrackMutationResult>(() => ({
      ok: true,
    }));
    mount(
      <TrackSettingsColorField
        fallbackColor="#010203"
        label="Signal color"
        mode="optional"
        value="#abc"
        onCommit={onCommit}
      />,
    );

    expect(getInput("Signal color").value).toBe("#abc");
    click(getButton("Open Signal color color picker"));
    expect(document.body.textContent).toContain("Selected color: #010203");
    keyDown(getSlider("Signal color saturation"), "Escape");
    expect(onCommit).not.toHaveBeenCalled();

    click(getButton("Clear Signal color"));
    expect(onCommit).toHaveBeenCalledWith(undefined);
  });

  it("opens with named controls, focuses the picker, and restores focus when closed", () => {
    mount(
      <TrackSettingsColorField
        label="Track color"
        mode="required"
        value="#FF0000"
        onCommit={() => ({ ok: true })}
      />,
    );
    const opener = getButton("Open Track color color picker");

    click(opener);

    const saturation = getSlider("Track color saturation");
    expect(document.activeElement).toBe(saturation);
    expect(document.body.textContent).toContain("Selected color: #FF0000");
    expect(getSaturationValueSurface("Track color").getAttribute("aria-valuenow")).toBeNull();
    expect(saturation.getAttribute("aria-valuemin")).toBe("0");
    expect(saturation.getAttribute("aria-valuemax")).toBe("100");
    const brightness = getSlider("Track color brightness");
    expect(brightness.getAttribute("aria-valuemin")).toBe("0");
    expect(brightness.getAttribute("aria-valuemax")).toBe("100");
    const hue = getSlider("Track color hue");
    expect(hue.getAttribute("aria-valuemin")).toBe("0");
    expect(hue.getAttribute("aria-valuemax")).toBe("359");

    keyDown(hue, "Escape");
    expect(document.activeElement).toBe(opener);
  });

  it("emits normalized previews for pointer, saturation/value keyboard, and hue changes", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    mount(<RequiredHarness initialValue="#FF0000" onCommit={onCommit} />);
    click(getButton("Open Track color color picker"));
    const surface = getSaturationValueSurface("Track color");
    surface.getBoundingClientRect = () =>
      ({
        bottom: 100,
        height: 100,
        left: 0,
        right: 100,
        top: 0,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => undefined,
      }) as DOMRect;

    pointer(surface, "pointerdown", { clientX: 25, clientY: 75, pointerId: 7 });
    pointer(surface, "pointermove", { clientX: 100, clientY: 0, pointerId: 7 });
    expect(onCommit.mock.calls.slice(0, 2)).toEqual([["#403030"], ["#FF0000"]]);

    updateRange(getSlider("Track color saturation"), "99");
    expect(onCommit).toHaveBeenLastCalledWith("#FF0303");

    updateRange(getSlider("Track color hue"), "120");
    expect(onCommit).toHaveBeenLastCalledWith("#03FF03");
    for (const [color] of onCommit.mock.calls) expect(color).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("keeps the accepted picker color when a preview mutation is rejected", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({
      ok: false,
      error: "Core rejected this color.",
    }));
    mount(
      <TrackSettingsColorField
        label="Track color"
        mode="required"
        value="#FF0000"
        onCommit={onCommit}
      />,
    );
    click(getButton("Open Track color color picker"));

    updateRange(getSlider("Track color hue"), "120");

    expect(onCommit).toHaveBeenCalledWith("#00FF00");
    expect(getSlider("Track color hue").value).toBe("0");
    expect(document.body.textContent).toContain("Selected color: #FF0000");
    expect(getInput("Track color").value).toBe("#FF0000");
    expect(document.body.textContent).toContain("Core rejected this color.");
  });

  it("preserves hue through achromatic picker changes and honest external updates", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    mount(
      <TrackSettingsColorField
        label="Track color"
        mode="required"
        value="#000000"
        onCommit={onCommit}
      />,
    );
    click(getButton("Open Track color color picker"));

    updateRange(getSlider("Track color hue"), "240");
    expect(onCommit).not.toHaveBeenCalled();
    expect(getSlider("Track color hue").value).toBe("240");

    updateRange(getSlider("Track color saturation"), "100");
    expect(onCommit).not.toHaveBeenCalled();
    updateRange(getSlider("Track color brightness"), "10");
    expect(onCommit).toHaveBeenLastCalledWith("#00001A");

    rerender(
      <TrackSettingsColorField
        label="Track color"
        mode="required"
        value="#00FF00"
        onCommit={onCommit}
      />,
    );
    expect(Number(getSlider("Track color hue").value)).toBeCloseTo(120);
  });

  it("accumulates keyboard slider steps even while their hex output is unchanged", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    mount(<RequiredHarness initialValue="#000000" onCommit={onCommit} />);
    click(getButton("Open Track color color picker"));
    updateRange(getSlider("Track color hue"), "120");

    const saturation = getSlider("Track color saturation");
    for (let step = 1; step <= 10; step += 1) {
      keyboardRangeStep(saturation, "ArrowRight");
      expect(Number(saturation.value)).toBe(step);
    }
    expect(onCommit).not.toHaveBeenCalled();

    const brightness = getSlider("Track color brightness");
    for (let step = 1; step <= 10; step += 1) keyboardRangeStep(brightness, "ArrowRight");
    expect(onCommit).toHaveBeenLastCalledWith("#171A17");
  });

  it("closes and blocks stale picker interaction when disabled while open", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    const renderField = (disabled: boolean) => (
      <TrackSettingsColorField
        disabled={disabled}
        label="Track color"
        mode="required"
        value="#FF0000"
        onCommit={onCommit}
      />
    );
    mount(renderField(false));
    click(getButton("Open Track color color picker"));
    const surface = getSaturationValueSurface("Track color");
    setSurfaceBounds(surface);

    rerender(renderField(true));
    pointer(surface, "pointerdown", { clientX: 50, clientY: 50, pointerId: 1 });
    act(() => vi.runAllTimers());

    expect(onCommit).not.toHaveBeenCalled();
    expect(getButton("Open Track color color picker").disabled).toBe(true);
    expect(
      document.body.querySelector('[role="group"][aria-label="Track color color picker"]'),
    ).toBeNull();
  });

  it("ignores non-primary pointers and nonzero mouse or pen buttons", () => {
    const onCommit = vi.fn<(color: string) => TrackMutationResult>(() => ({ ok: true }));
    mount(<RequiredHarness initialValue="#FF0000" onCommit={onCommit} />);
    click(getButton("Open Track color color picker"));
    const surface = getSaturationValueSurface("Track color");
    setSurfaceBounds(surface);

    pointer(surface, "pointerdown", {
      button: 2,
      clientX: 50,
      clientY: 50,
      pointerId: 1,
    });
    pointer(surface, "pointerdown", {
      button: 1,
      clientX: 50,
      clientY: 50,
      pointerId: 2,
      pointerType: "pen",
    });
    pointer(surface, "pointerdown", {
      clientX: 50,
      clientY: 50,
      isPrimary: false,
      pointerId: 3,
    });
    expect(onCommit).not.toHaveBeenCalled();

    pointer(surface, "pointerdown", { clientX: 50, clientY: 50, pointerId: 4 });
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("constrains the portaled picker to the viewport without clipping its surface", () => {
    mount(
      <TrackSettingsColorField
        label="Track color"
        mode="required"
        value="#123456"
        onCommit={() => ({ ok: true })}
      />,
    );
    click(getButton("Open Track color color picker"));

    const paper = document.body.querySelector<HTMLElement>(".MuiPopover-paper");
    expect(paper).toBeTruthy();
    expect(getComputedStyle(paper as HTMLElement).maxWidth).toBe("calc(100vw - 16px)");
    expect(getSaturationValueSurface("Track color").getAttribute("role")).toBe("img");
    expect(paper?.closest("body")).toBe(document.body);
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
      mode="required"
      value={value}
      onCommit={(color) => {
        const result = onCommit(color);
        if (result.ok) setValue(color);
        return result;
      }}
    />
  );
}

function OptionalHarness({
  initialValue,
  onCommit,
}: {
  initialValue: string | undefined;
  onCommit: (color: string | undefined) => TrackMutationResult;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <TrackSettingsColorField
      fallbackColor="#0A0B0C"
      label="Signal color"
      mode="optional"
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

function getSaturationValueSurface(label: string) {
  const surface = document.body.querySelector<HTMLElement>(
    `[role="img"][aria-label^="${label} saturation and brightness plane."]`,
  );
  if (!surface) throw new Error(`Could not find saturation/value surface for ${label}`);
  return surface;
}

function getSlider(label: string) {
  const slider = Array.from(
    document.body.querySelectorAll<HTMLInputElement>('input[type="range"]'),
  ).find((candidate) => candidate.getAttribute("aria-label") === label);
  if (!slider) throw new Error(`Could not find slider labeled ${label}`);
  return slider;
}

function updateInput(input: HTMLInputElement, value: string) {
  setNativeInputValue(input, value);
  act(() => input.dispatchEvent(new Event("input", { bubbles: true })));
}

function updateRange(input: HTMLInputElement, value: string) {
  setNativeInputValue(input, value);
  act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
}

function keyboardRangeStep(input: HTMLInputElement, key: "ArrowLeft" | "ArrowRight") {
  keyDown(input, key);
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) throw new Error("Input value setter is unavailable");
  valueSetter.call(input, value);
}

function blur(input: HTMLInputElement) {
  act(() => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
}

function click(element: HTMLElement) {
  act(() => element.click());
}

function keyDown(element: HTMLElement, key: string) {
  act(() => element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key })));
}

function pointer(
  element: HTMLElement,
  type: string,
  init: {
    button?: number;
    clientX: number;
    clientY: number;
    isPrimary?: boolean;
    pointerId: number;
    pointerType?: string;
  },
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: init.button ?? 0,
    clientX: init.clientX,
    clientY: init.clientY,
  });
  Object.defineProperty(event, "pointerId", { value: init.pointerId });
  Object.defineProperty(event, "pointerType", { value: init.pointerType ?? "mouse" });
  Object.defineProperty(event, "isPrimary", { value: init.isPrimary ?? true });
  act(() => element.dispatchEvent(event));
}

function setSurfaceBounds(surface: HTMLElement) {
  surface.getBoundingClientRect = () =>
    ({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    }) as DOMRect;
}
