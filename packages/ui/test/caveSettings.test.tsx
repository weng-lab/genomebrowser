// @vitest-environment jsdom

import { type CaveConfig, type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaveSettings } from "../src/tracks/cave/settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const config: CaveConfig = {
  neurotransmitter: "GABA",
  age: "Early_Adulthood",
  topColor: "#d9d9ff",
  bottomColor: "#3333ff",
};

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("CAVE settings", () => {
  it("renders controlled inputs for every CAVE config option", () => {
    renderSettings();

    expect(container?.textContent).toContain("CAVE dataset");
    expect(container?.textContent).toContain("Signal colors");
    expect(getSelect("Neurotransmitter").textContent).toBe("GABA");
    expect(getSelect("Age").textContent).toBe("Early adulthood");
    expect(getInput("Top color").value).toBe("#D9D9FF");
    expect(getInput("Bottom color").value).toBe("#3333FF");
  });

  it("groups dataset selectors and signal colors into semantic rows", () => {
    renderSettings();

    expect(getFieldContainer(getSelect("Neurotransmitter")).parentElement).toBe(
      getFieldContainer(getSelect("Age")).parentElement,
    );
    expect(getFieldContainer(getInput("Top color")).parentElement).toBe(
      getFieldContainer(getInput("Bottom color")).parentElement,
    );
    expect(
      getComputedStyle(getFieldContainer(getInput("Top color")).parentElement as HTMLElement)
        .flexWrap,
    ).toBe("wrap");
  });

  it("updates dataset selections and validated color overrides, including cleared colors", async () => {
    const updateConfig = renderSettings();

    await chooseOption("Neurotransmitter", "GLU");
    await chooseOption("Age", "Late childhood");
    updateInput("Top color", "#112233");
    blurInput("Top color");
    updateInput("Bottom color", "#445566");
    blurInput("Bottom color");
    updateInput("Top color", "");
    blurInput("Top color");
    updateInput("Bottom color", "");
    blurInput("Bottom color");

    expect(updateConfig.mock.calls).toEqual([
      [{ neurotransmitter: "GLU" }],
      [{ age: "Late_Childhood" }],
      [{ topColor: "#112233" }],
      [{ bottomColor: "#445566" }],
      [{ topColor: undefined }],
      [{ bottomColor: undefined }],
    ]);
  });

  it("derives display-only fallbacks without materializing optional overrides", () => {
    const updateConfig = renderSettings({ ...config, topColor: undefined, bottomColor: undefined });

    expect(getInput("Top color").value).toBe("");
    expect(getInput("Top color").placeholder).toBe("#808080");
    expect(getInput("Bottom color").value).toBe("");
    expect(getInput("Bottom color").placeholder).toBe("#000000");
    const opener = getButton("Open Top color color picker");
    act(() => opener.click());
    const saturation = getSlider("Top color saturation");
    act(() =>
      saturation.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })),
    );

    expect(updateConfig).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it("derives the top display fallback from an explicit bottom color", () => {
    renderSettings({ ...config, topColor: undefined, bottomColor: "#3333ff" });

    expect(getInput("Top color").placeholder).toBe("#B3B3FF");
    expect(getInput("Bottom color").value).toBe("#3333FF");
  });

  it("preserves legacy colors and derives a defensive picker fallback", () => {
    const updateConfig = renderSettings({ ...config, topColor: "tomato", bottomColor: "#abc" });

    expect(getInput("Top color").value).toBe("tomato");
    expect(getInput("Top color").placeholder).toBe("#FFFFFF");
    expect(getInput("Bottom color").value).toBe("#abc");
    const opener = getButton("Open Top color color picker");
    act(() => opener.click());
    expect(document.body.textContent).toContain("Selected color: #FFFFFF");
    const saturation = getSlider("Top color saturation");
    act(() =>
      saturation.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })),
    );

    expect(updateConfig).not.toHaveBeenCalled();
    expect(getInput("Top color").value).toBe("tomato");
    expect(getInput("Bottom color").value).toBe("#abc");
  });

  it("derives safely when the bottom color is an existing CSS value", () => {
    const updateConfig = renderSettings({
      ...config,
      topColor: undefined,
      bottomColor: "tomato",
    });

    expect(getInput("Top color").value).toBe("");
    expect(getInput("Top color").placeholder).toBe("#808080");
    expect(getInput("Bottom color").value).toBe("tomato");
    expect(updateConfig).not.toHaveBeenCalled();
  });
});

function renderSettings(initialConfig = config) {
  const updateConfig = vi.fn<TrackSettingsProps<CaveConfig>["updateConfig"]>(() => ({
    ok: true,
  }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(<CaveSettings id="cave" config={initialConfig} updateConfig={updateConfig} />);
  });
  return updateConfig;
}

function getInput(label: string) {
  const input = Array.from(container?.querySelectorAll<HTMLInputElement>("input") ?? []).find(
    (candidate) =>
      Array.from(candidate.labels ?? []).some((element) => element.textContent === label),
  );
  if (!input) throw new Error(`Could not find input labeled ${label}`);
  return input;
}

function getSelect(label: string) {
  const select = Array.from(
    container?.querySelectorAll<HTMLElement>('[role="combobox"]') ?? [],
  ).find((candidate) =>
    candidate
      .getAttribute("aria-labelledby")
      ?.split(" ")
      .some((id) => document.getElementById(id)?.textContent === label),
  );
  if (!select) throw new Error(`Could not find select labeled ${label}`);
  return select;
}

function getFieldContainer(control: Element) {
  const field = control.closest<HTMLElement>(".MuiFormControl-root");
  if (!field) throw new Error("Could not find field container");
  return field;
}

async function chooseOption(label: string, optionLabel: string) {
  await act(async () => {
    getSelect(label).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
  });

  const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (candidate) => candidate.textContent === optionLabel,
  );
  if (!option) throw new Error(`Could not find ${optionLabel} option for ${label}`);

  await act(async () => option.click());
}

function updateInput(label: string, value: string) {
  const input = getInput(label);
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
