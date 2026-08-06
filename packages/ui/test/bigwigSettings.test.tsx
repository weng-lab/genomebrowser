// @vitest-environment jsdom

import {
  bigWigModule,
  createTrackStore,
  type BigWigConfig,
  type TrackMutationResult,
  type TrackUpdate,
} from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BigWigSettings } from "../src/tracks/bigwig/settings";
import { TrackSettingsTestProvider } from "./trackSettingsTestProvider";

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal()),
  ...(await import("../../core/src/browser/state/browserContextState")),
}));

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
    expect(getInput("Clamp indicator color").value).toBe("#FF0000");
    expect(getInput("Clamp indicator color").required).toBe(true);
    expect(getOptionalButton("Clear Clamp indicator color")).toBeUndefined();
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
    const updateTrack = renderSettings();

    updateInput("URL", "YOUR_OTHER_URL_HERE");
    clickInput("Fill missing values with zero");
    updateInput("Clamp indicator color", "#663399");
    blurInput("Clamp indicator color");
    clickInput("Show clamp indicators");
    updateInput("Minimum", "-1.5");
    updateInput("Maximum", "12");
    act(() => vi.advanceTimersByTime(300));

    expect(updateTrack.mock.calls).toEqual([
      [{ config: { fillWithZero: true } }],
      [{ config: { clampIndicatorColor: "#663399" } }],
      [{ config: { showClampIndicators: false } }],
      [{ config: { url: "YOUR_OTHER_URL_HERE" } }],
      [{ config: { yRange: { min: -1.5, max: 12 } } }],
    ]);
  });

  it("commits and preserves a minimum-only y-axis override on blur", () => {
    vi.useFakeTimers();
    const updateTrack = renderSettings({ ...config, yRange: undefined });

    updateInput("Minimum", "0");
    blurInput("Minimum");

    expect(updateTrack).toHaveBeenCalledWith({ config: { yRange: { min: 0 } } });
    expect(getInput("Minimum").value).toBe("0");
    expect(getInput("Maximum").value).toBe("");
  });

  it("commits and preserves a maximum-only y-axis override on blur", () => {
    vi.useFakeTimers();
    const updateTrack = renderSettings({ ...config, yRange: undefined });

    updateInput("Maximum", "10");
    blurInput("Maximum");

    expect(updateTrack).toHaveBeenCalledWith({ config: { yRange: { max: 10 } } });
    expect(getInput("Minimum").value).toBe("");
    expect(getInput("Maximum").value).toBe("10");
  });

  it("commits both explicit y-axis bounds together", () => {
    vi.useFakeTimers();
    const updateTrack = renderSettings({ ...config, yRange: undefined });

    updateInput("Minimum", "0");
    updateInput("Maximum", "10");
    act(() => vi.advanceTimersByTime(300));

    expect(updateTrack).toHaveBeenCalledTimes(1);
    expect(updateTrack).toHaveBeenCalledWith({ config: { yRange: { min: 0, max: 10 } } });
  });

  it("commits undefined when both y-axis bounds are blank", () => {
    const updateTrack = renderSettings();

    act(() => getAutomaticRangeButton().click());

    expect(updateTrack).toHaveBeenCalledWith({ config: { yRange: undefined } });
    expect(getInput("Minimum").value).toBe("");
    expect(getInput("Maximum").value).toBe("");
  });

  it("preserves an invalid explicit pair and shows an error without committing it", () => {
    vi.useFakeTimers();
    const updateTrack = renderSettings({ ...config, yRange: undefined });

    updateInput("Minimum", "10");
    updateInput("Maximum", "5");
    blurInput("Maximum");

    expect(updateTrack).not.toHaveBeenCalled();
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

  it("renders the required clamp default materialized by the core module", () => {
    const normalizedConfig = bigWigModule.create({
      id: "normalized-signal",
      title: "Normalized signal",
      config: { url: "YOUR_URL_HERE" },
    }).config;
    const updateTrack = renderSettings(normalizedConfig);

    const color = getInput("Clamp indicator color");
    expect(normalizedConfig.clampIndicatorColor).toBe("#ff0000");
    expect(color.value).toBe("#FF0000");
    expect(color.required).toBe(true);
    expect(getOptionalButton("Clear Clamp indicator color")).toBeUndefined();
    const opener = getButton("Open Clamp indicator color color picker");
    act(() => opener.click());
    const saturation = getSlider("Clamp indicator color saturation");
    act(() =>
      saturation.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })),
    );
    expect(updateTrack).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it("disables the complete clamp color control when clamp indicators are hidden", () => {
    const updateTrack = renderSettings({ ...config, showClampIndicators: false });

    const color = getInput("Clamp indicator color");
    expect(color.disabled).toBe(true);
    expect(getButton("Open Clamp indicator color color picker").disabled).toBe(true);
    expect(getOptionalButton("Clear Clamp indicator color")).toBeUndefined();
    expect(updateTrack).not.toHaveBeenCalled();
  });
});

function renderSettings(initialConfig = config) {
  const updateTrack = vi.fn<(update: TrackUpdate<BigWigConfig>) => TrackMutationResult>(() => ({
    ok: true,
  }));
  const trackStore = createTrackStore({
    modules: [bigWigModule],
    tracks: [
      bigWigModule.create({
        id: "signal",
        title: "Signal",
        height: 80,
        color: "#2266aa",
        config: initialConfig,
      }),
    ],
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TrackSettingsTestProvider
        trackId="signal"
        trackStore={trackStore}
        updateTrack={(update) => updateTrack(update as TrackUpdate<BigWigConfig>)}
      >
        <BigWigSettings />
      </TrackSettingsTestProvider>,
    );
  });
  return updateTrack;
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

function getButton(name: string) {
  const button = getOptionalButton(name);
  if (!button) throw new Error(`Could not find button named ${name}`);
  return button;
}

function getOptionalButton(name: string) {
  return Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === name,
  );
}

function getSlider(name: string) {
  const slider = Array.from(
    document.body.querySelectorAll<HTMLInputElement>('input[type="range"]'),
  ).find((candidate) => candidate.getAttribute("aria-label") === name);
  if (!slider) throw new Error(`Could not find slider named ${name}`);
  return slider;
}

function clickInput(label: string) {
  act(() => getInput(label).click());
}
