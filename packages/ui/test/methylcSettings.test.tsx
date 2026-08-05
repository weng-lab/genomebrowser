// @vitest-environment jsdom

import { type MethylCConfig, type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MethylCSettings } from "../src/tracks/methylc/settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const config: MethylCConfig = {
  urls: {
    plusStrand: {
      cpg: { url: "PLUS_CPG_URL" },
      chg: { url: "PLUS_CHG_URL" },
      chh: { url: "PLUS_CHH_URL" },
      depth: { url: "PLUS_DEPTH_URL" },
    },
    minusStrand: {
      cpg: { url: "MINUS_CPG_URL" },
      chg: { url: "MINUS_CHG_URL" },
      chh: { url: "MINUS_CHH_URL" },
      depth: { url: "MINUS_DEPTH_URL" },
    },
  },
  colors: {
    cpg: "#648bd8",
    chg: "#ff944d",
    chh: "#ff00ff",
    depth: "#525252",
  },
  maskCpgByCoverage: true,
  range: { min: -2, max: 8 },
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

describe("methylC settings", () => {
  it("renders accessible controls for every methylC config option", () => {
    renderSettings();

    expect(container?.textContent).toContain("Plus-strand sources");
    expect(container?.textContent).toContain("Minus-strand sources");
    expect(container?.textContent).toContain("Colors");
    expect(container?.textContent).toContain("Rendering and range");
    expect(getInput("Plus-strand CpG URL").value).toBe(config.urls.plusStrand.cpg.url);
    expect(getInput("Plus-strand CHG URL").value).toBe(config.urls.plusStrand.chg.url);
    expect(getInput("Plus-strand CHH URL").value).toBe(config.urls.plusStrand.chh.url);
    expect(getInput("Plus-strand Depth URL").value).toBe(config.urls.plusStrand.depth.url);
    expect(getInput("Minus-strand CpG URL").value).toBe(config.urls.minusStrand.cpg.url);
    expect(getInput("Minus-strand CHG URL").value).toBe(config.urls.minusStrand.chg.url);
    expect(getInput("Minus-strand CHH URL").value).toBe(config.urls.minusStrand.chh.url);
    expect(getInput("Minus-strand Depth URL").value).toBe(config.urls.minusStrand.depth.url);
    expect(getInput("CpG color").value).toBe(config.colors.cpg);
    expect(getInput("CHG color").value).toBe(config.colors.chg);
    expect(getInput("CHH color").value).toBe(config.colors.chh);
    expect(getInput("Depth color").value).toBe(config.colors.depth);
    expect(getInput("Mask CpG by coverage").checked).toBe(true);
    expect(getInput("Minimum").value).toBe(String(config.range?.min));
    expect(getInput("Maximum").value).toBe(String(config.range?.max));
  });

  it("flows peer fields while keeping the range and coverage controls distinct", () => {
    renderSettings();

    expect(getFieldContainer("Plus-strand CpG URL").parentElement).toBe(
      getFieldContainer("Plus-strand CHG URL").parentElement,
    );
    expect(
      getComputedStyle(getFieldContainer("Plus-strand CpG URL").parentElement as HTMLElement)
        .display,
    ).toBe("grid");
    expect(getFieldContainer("CpG color").parentElement).toBe(
      getFieldContainer("Depth color").parentElement,
    );
    expect(getFieldContainer("Minimum").parentElement).toBe(
      getFieldContainer("Maximum").parentElement,
    );
    expect(
      getComputedStyle(getFieldContainer("Minimum").parentElement as HTMLElement).display,
    ).toBe("flex");
    expect(getFieldContainer("Mask CpG by coverage").parentElement).not.toBe(
      getFieldContainer("Minimum").parentElement,
    );
  });

  it("updates nested values while preserving their siblings", () => {
    vi.useFakeTimers();
    const { updateConfig } = renderSettings();

    updateInput("Plus-strand CpG URL", "UPDATED_PLUS_CPG_URL");
    updateInput("Plus-strand CHG URL", "UPDATED_PLUS_CHG_URL");
    updateInput("Depth color", "rebeccapurple");
    clickInput("Mask CpG by coverage");
    act(() => vi.advanceTimersByTime(300));

    expect(updateConfig.mock.calls).toEqual([
      [{ colors: { ...config.colors, depth: "rebeccapurple" } }],
      [{ maskCpgByCoverage: false }],
      [
        {
          urls: {
            ...config.urls,
            plusStrand: {
              ...config.urls.plusStrand,
              cpg: { url: "UPDATED_PLUS_CPG_URL" },
            },
          },
        },
      ],
      [
        {
          urls: {
            ...config.urls,
            plusStrand: {
              ...config.urls.plusStrand,
              cpg: { url: "UPDATED_PLUS_CPG_URL" },
              chg: { url: "UPDATED_PLUS_CHG_URL" },
            },
          },
        },
      ],
    ]);
  });

  it("retains the first bound through a focus transition and commits the pair on Enter", () => {
    vi.useFakeTimers();
    const { updateConfig } = renderSettings({ ...config, range: undefined });

    focusInput("Minimum");
    updateInput("Minimum", "0");
    focusInput("Maximum");

    expect(updateConfig).not.toHaveBeenCalled();
    expect(getInput("Minimum").value).toBe("0");
    expect(getInput("Maximum").value).toBe("");
    expect(container?.textContent).toContain("Enter both minimum and maximum.");

    updateInput("Maximum", "10");
    keyDownInput("Maximum", "Enter");

    expect(updateConfig).toHaveBeenLastCalledWith({ range: { min: 0, max: 10 } });
  });

  it("requires both manually entered bounds and clears the pair with the automatic action", () => {
    vi.useFakeTimers();
    const { updateConfig } = renderSettings();

    updateInput("Minimum", "");
    act(() => vi.advanceTimersByTime(300));

    expect(updateConfig).not.toHaveBeenCalled();
    expect(getInput("Minimum").value).toBe("");
    expect(getInput("Maximum").value).toBe("8");

    act(() => getAutomaticRangeButton().click());

    expect(updateConfig).toHaveBeenLastCalledWith({ range: undefined });
  });
});

function renderSettings(initialConfig = config) {
  const updateConfig = vi.fn<TrackSettingsProps<MethylCConfig>["updateConfig"]>(() => ({
    ok: true,
  }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  const rerender = (nextConfig: MethylCConfig) => {
    act(() => {
      root?.render(
        <MethylCSettings id="methylc" config={nextConfig} updateConfig={updateConfig} />,
      );
    });
  };

  rerender(initialConfig);
  return { rerender, updateConfig };
}

function getInput(label: string) {
  const input = Array.from(container?.querySelectorAll<HTMLInputElement>("input") ?? []).find(
    (candidate) =>
      Array.from(candidate.labels ?? []).some((element) => element.textContent === label),
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

function clickInput(label: string) {
  act(() => getInput(label).click());
}

function focusInput(label: string) {
  act(() => getInput(label).focus());
}

function keyDownInput(label: string, key: string) {
  act(() => getInput(label).dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key })));
}

function getAutomaticRangeButton() {
  const button = Array.from(container?.querySelectorAll("button") ?? []).find(
    (candidate) => candidate.textContent === "Use automatic range",
  );
  if (!button) throw new Error("Could not find the automatic range button");
  return button;
}
