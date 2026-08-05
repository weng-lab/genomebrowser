// @vitest-environment jsdom

import { defaultScreenGraphQlEndpoint, type TranscriptConfig } from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TranscriptSettings } from "../src/tracks/transcript/settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const config: TranscriptConfig = {
  endpoint: defaultScreenGraphQlEndpoint,
  assembly: "GRCh38",
  version: 40,
  geneName: "SOX4",
  canonicalColor: "#d45c2f",
  highlightColor: "#1f77b4",
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

describe("Transcript settings", () => {
  it("shows an accessible control for every transcript config option", () => {
    renderSettings();

    expect(container?.textContent).toContain("Transcript source");
    expect(container?.textContent).toContain("Transcript highlighting");
    expect(getInput("Endpoint").value).toBe(config.endpoint);
    expect(getInput("Assembly").value).toBe(config.assembly);
    expect(getInput("Version").value).toBe(String(config.version));
    expect(getInput("Highlight gene").value).toBe(config.geneName);
    expect(getInput("Canonical color").value).toBe("#D45C2F");
    expect(getInput("Highlight color").value).toBe("#1F77B4");
  });

  it("uses full-width controls and semantic responsive pairs", () => {
    renderSettings();

    expect(
      getComputedStyle(getFieldContainer("Endpoint").parentElement as HTMLElement).gridColumn,
    ).toBe("1/-1");
    expect(getFieldContainer("Assembly").parentElement).toBe(
      getFieldContainer("Version").parentElement,
    );
    expect(
      getComputedStyle(getFieldContainer("Highlight gene").parentElement as HTMLElement).gridColumn,
    ).toBe("1/-1");
    expect(getFieldContainer("Canonical color").parentElement).toBe(
      getFieldContainer("Highlight color").parentElement,
    );
    const assemblyRow = getFieldContainer("Assembly").parentElement as HTMLElement;
    expect(getComputedStyle(assemblyRow).display).toBe("flex");
    expect(getComputedStyle(assemblyRow).flexWrap).toBe("nowrap");
  });

  it("updates typed values and clears optional values", () => {
    vi.useFakeTimers();
    const updateConfig = renderSettings();

    updateInput("Endpoint", "");
    updateInput("Assembly", "GRCh37");
    updateInput("Version", "41");
    act(() => vi.advanceTimersByTime(300));
    updateInput("Highlight gene", "");
    updateInput("Canonical color", "");
    blurInput("Canonical color");
    updateInput("Highlight color", "");
    blurInput("Highlight color");
    updateInput("Version", "4.5");

    expect(updateConfig.mock.calls).toEqual([
      [{ assembly: "GRCh37" }],
      [{ version: 41 }],
      [{ geneName: undefined }],
      [{ canonicalColor: undefined }],
      [{ highlightColor: undefined }],
    ]);
  });

  it("uses neutral display-only fallbacks without materializing optional colors", () => {
    const updateConfig = renderSettings({
      ...config,
      canonicalColor: undefined,
      highlightColor: undefined,
    });

    expect(getInput("Canonical color").value).toBe("");
    expect(getInput("Canonical color").placeholder).toBe("#000000");
    expect(getInput("Highlight color").value).toBe("");
    expect(getInput("Highlight color").placeholder).toBe("#000000");
    const opener = getButton("Open Canonical color color picker");
    act(() => opener.click());
    const saturation = getSlider("Canonical color saturation");
    act(() =>
      saturation.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })),
    );

    expect(updateConfig).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it("preserves core-valid legacy highlight colors until replacement", () => {
    const updateConfig = renderSettings({
      ...config,
      canonicalColor: "rebeccapurple",
      highlightColor: "#abc",
    });

    expect(getInput("Canonical color").value).toBe("rebeccapurple");
    expect(getInput("Highlight color").value).toBe("#abc");
    const opener = getButton("Open Canonical color color picker");
    act(() => opener.click());
    expect(document.body.textContent).toContain("Selected color: #000000");
    const saturation = getSlider("Canonical color saturation");
    act(() =>
      saturation.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })),
    );

    expect(updateConfig).not.toHaveBeenCalled();
    expect(getInput("Canonical color").value).toBe("rebeccapurple");
  });
});

function renderSettings(initialConfig = config) {
  const updateConfig = vi.fn((): { ok: true } => ({ ok: true }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TranscriptSettings id="genes" config={initialConfig} updateConfig={updateConfig} />,
    );
  });
  return updateConfig;
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

function getFieldContainer(label: string) {
  const field = getInput(label).closest<HTMLElement>(".MuiFormControl-root");
  if (!field) throw new Error(`Could not find field container for ${label}`);
  return field;
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
