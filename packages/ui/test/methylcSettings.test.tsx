// @vitest-environment jsdom

import {
  methylCModule,
  type MethylCConfig,
  type TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { methylCModuleWithSettings } from "../src/tracks/methylc/module";
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

  it("updates nested values while preserving their siblings", () => {
    const { updateConfig } = renderSettings();

    updateInput("Plus-strand CpG URL", "UPDATED_PLUS_CPG_URL");
    updateInput("Depth color", "rebeccapurple");
    clickInput("Mask CpG by coverage");

    expect(updateConfig.mock.calls).toEqual([
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
      [{ colors: { ...config.colors, depth: "rebeccapurple" } }],
      [{ maskCpgByCoverage: false }],
    ]);
  });

  it("creates a complete range and clears it when a bound is blank", () => {
    const { rerender, updateConfig } = renderSettings({ ...config, range: undefined });

    updateInput("Minimum", "0");
    expect(updateConfig).not.toHaveBeenCalled();

    updateInput("Maximum", "10");
    expect(updateConfig).toHaveBeenLastCalledWith({ range: { min: 0, max: 10 } });

    rerender({ ...config, range: { min: 0, max: 10 } });
    updateInput("Minimum", "");

    expect(updateConfig).toHaveBeenLastCalledWith({ range: undefined });
  });
});

describe("methylC module with settings", () => {
  it("adds the UI settings component without changing the core module", () => {
    expect(methylCModuleWithSettings).not.toBe(methylCModule);
    expect(methylCModuleWithSettings.settingsComponent).toBe(MethylCSettings);
    expect(methylCModule.settingsComponent).not.toBe(MethylCSettings);
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
