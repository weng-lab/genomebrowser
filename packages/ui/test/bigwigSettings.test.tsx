// @vitest-environment jsdom

import { type BigWigConfig, type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BigWigSettings } from "../src/tracks/bigwig/settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const config: BigWigConfig = {
  url: "YOUR_URL_HERE",
  fillWithZero: false,
  yRange: { min: -2, max: 8 },
  showClampIndicators: true,
  clampIndicatorColor: "#ff0000",
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

describe("BigWig settings", () => {
  it("renders accessible controls for every BigWig config option", () => {
    renderSettings();

    expect(getInput("URL").value).toBe(config.url);
    expect(getInput("Minimum").value).toBe(String(config.yRange?.min));
    expect(getInput("Maximum").value).toBe(String(config.yRange?.max));
    expect(getInput("Fill missing values with zero").checked).toBe(false);
    expect(getInput("Show clamp indicators").checked).toBe(true);
    expect(getInput("Clamp indicator color").value).toBe(config.clampIndicatorColor);
  });

  it("keeps full-width and related controls in semantic rows", () => {
    renderSettings();

    expect(getComputedStyle(getFieldContainer("URL").parentElement as HTMLElement).gridColumn).toBe(
      "1/-1",
    );
    expect(getFieldContainer("Minimum").parentElement).toBe(
      getFieldContainer("Maximum").parentElement,
    );
    expect(
      getComputedStyle(getFieldContainer("Minimum").parentElement as HTMLElement).display,
    ).toBe("flex");
    expect(getFieldContainer("Show clamp indicators").parentElement).toBe(
      getFieldContainer("Clamp indicator color").parentElement,
    );
    const clampGroup = getFieldContainer("Show clamp indicators").parentElement?.parentElement;
    expect(clampGroup).toBeTruthy();
    expect(getComputedStyle(clampGroup as HTMLElement).borderLeftWidth).toBe("2px");
    expect(getComputedStyle(clampGroup as HTMLElement).paddingLeft).toBe("8px");
    expect(getFieldContainer("Fill missing values with zero").parentElement).not.toBe(
      getFieldContainer("Show clamp indicators").parentElement,
    );
  });

  it("updates scalar options and preserves both y-axis bounds", () => {
    vi.useFakeTimers();
    const updateConfig = renderSettings();

    updateInput("URL", "YOUR_OTHER_URL_HERE");
    clickInput("Fill missing values with zero");
    updateInput("Clamp indicator color", "rebeccapurple");
    clickInput("Show clamp indicators");
    updateInput("Minimum", "-1.5");
    updateInput("Maximum", "12");
    act(() => vi.advanceTimersByTime(300));

    expect(updateConfig.mock.calls).toEqual([
      [{ fillWithZero: true }],
      [{ clampIndicatorColor: "rebeccapurple" }],
      [{ showClampIndicators: false }],
      [{ url: "YOUR_OTHER_URL_HERE" }],
      [{ yRange: { min: -1.5, max: 12 } }],
    ]);
  });

  it("commits and preserves a minimum-only y-axis override on blur", () => {
    vi.useFakeTimers();
    const updateConfig = renderSettings({ ...config, yRange: undefined });

    updateInput("Minimum", "0");
    blurInput("Minimum");

    expect(updateConfig).toHaveBeenCalledWith({ yRange: { min: 0 } });
    expect(getInput("Minimum").value).toBe("0");
    expect(getInput("Maximum").value).toBe("");
  });

  it("commits and preserves a maximum-only y-axis override on blur", () => {
    vi.useFakeTimers();
    const updateConfig = renderSettings({ ...config, yRange: undefined });

    updateInput("Maximum", "10");
    blurInput("Maximum");

    expect(updateConfig).toHaveBeenCalledWith({ yRange: { max: 10 } });
    expect(getInput("Minimum").value).toBe("");
    expect(getInput("Maximum").value).toBe("10");
  });

  it("commits both explicit y-axis bounds together", () => {
    vi.useFakeTimers();
    const updateConfig = renderSettings({ ...config, yRange: undefined });

    updateInput("Minimum", "0");
    updateInput("Maximum", "10");
    act(() => vi.advanceTimersByTime(300));

    expect(updateConfig).toHaveBeenCalledTimes(1);
    expect(updateConfig).toHaveBeenCalledWith({ yRange: { min: 0, max: 10 } });
  });

  it("commits undefined when both y-axis bounds are blank", () => {
    const updateConfig = renderSettings();

    act(() => getAutomaticRangeButton().click());

    expect(updateConfig).toHaveBeenCalledWith({ yRange: undefined });
    expect(getInput("Minimum").value).toBe("");
    expect(getInput("Maximum").value).toBe("");
  });

  it("preserves an invalid explicit pair and shows an error without committing it", () => {
    vi.useFakeTimers();
    const updateConfig = renderSettings({ ...config, yRange: undefined });

    updateInput("Minimum", "10");
    updateInput("Maximum", "5");
    blurInput("Maximum");

    expect(updateConfig).not.toHaveBeenCalled();
    expect(getInput("Minimum").value).toBe("10");
    expect(getInput("Maximum").value).toBe("5");
    expect(container?.textContent).toContain("Minimum must be less than maximum.");
    expect(getInput("Minimum").getAttribute("aria-invalid")).toBe("true");
    expect(getInput("Maximum").getAttribute("aria-invalid")).toBe("true");
    const minimumDescription = getInput("Minimum").getAttribute("aria-describedby");
    const maximumDescription = getInput("Maximum").getAttribute("aria-describedby");
    expect(minimumDescription).toBeTruthy();
    expect(maximumDescription).toBe(minimumDescription);
    expect(document.getElementById(minimumDescription ?? "")?.textContent).toBe(
      "Minimum must be less than maximum.",
    );
    expect(
      Array.from(container?.querySelectorAll("p") ?? []).filter(
        (element) => element.textContent === "Minimum must be less than maximum.",
      ),
    ).toHaveLength(1);
  });

  it("clears an optional clamp indicator color", () => {
    const updateConfig = renderSettings();

    updateInput("Clamp indicator color", "");

    expect(updateConfig).toHaveBeenCalledWith({ clampIndicatorColor: undefined });
  });
});

function renderSettings(initialConfig = config) {
  const updateConfig = vi.fn<TrackSettingsProps<BigWigConfig>["updateConfig"]>(() => ({
    ok: true,
  }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(<BigWigSettings id="signal" config={initialConfig} updateConfig={updateConfig} />);
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
  const input = getInput(label);
  const field = input.closest<HTMLElement>(".MuiFormControl-root, .MuiFormControlLabel-root");
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

function getAutomaticRangeButton() {
  const button = Array.from(container?.querySelectorAll("button") ?? []).find(
    (candidate) => candidate.textContent === "Use automatic range",
  );
  if (!button) throw new Error("Could not find the automatic range button");
  return button;
}

function clickInput(label: string) {
  act(() => getInput(label).click());
}
