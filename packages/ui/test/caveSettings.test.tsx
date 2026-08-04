// @vitest-environment jsdom

import { caveModule, type CaveConfig, type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { caveModuleWithSettings } from "../src/tracks/cave/module";
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
    expect(getInput("Top color").value).toBe(config.topColor);
    expect(getInput("Bottom color").value).toBe(config.bottomColor);
  });

  it("updates dataset selections and color overrides, including cleared colors", async () => {
    const updateConfig = renderSettings();

    await chooseOption("Neurotransmitter", "GLU");
    await chooseOption("Age", "Late childhood");
    updateInput("Top color", "rebeccapurple");
    updateInput("Bottom color", "tomato");
    updateInput("Top color", "");
    updateInput("Bottom color", "");

    expect(updateConfig.mock.calls).toEqual([
      [{ neurotransmitter: "GLU" }],
      [{ age: "Late_Childhood" }],
      [{ topColor: "rebeccapurple" }],
      [{ bottomColor: "tomato" }],
      [{ topColor: undefined }],
      [{ bottomColor: undefined }],
    ]);
  });
});

describe("CAVE module with settings", () => {
  it("directly extends the core module with the UI settings component", () => {
    expect(caveModuleWithSettings).not.toBe(caveModule);
    expect(caveModuleWithSettings.create).toBe(caveModule.create);
    expect(caveModuleWithSettings.settingsComponent).toBe(CaveSettings);
    expect(caveModule.settingsComponent).not.toBe(CaveSettings);
  });
});

function renderSettings() {
  const updateConfig = vi.fn<TrackSettingsProps<CaveConfig>["updateConfig"]>(() => ({
    ok: true,
  }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(<CaveSettings id="cave" config={config} updateConfig={updateConfig} />);
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
