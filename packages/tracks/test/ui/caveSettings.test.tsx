// @vitest-environment jsdom

import type { TrackMutationResult, TrackUpdate } from "@weng-lab/genomebrowser";
import {
  caveModule,
  type CaveConfig,
  type CaveTooltipItem,
} from "@weng-lab/genomebrowser-tracks/cave";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaveSettings } from "../../src/cave/settings";

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
    const colorRow = getFieldContainer(getInput("Top color")).parentElement as HTMLElement;
    expect(getComputedStyle(colorRow).display).toBe("flex");
    expect(getComputedStyle(colorRow).flexWrap).toBe("nowrap");
  });

  it("updates dataset selections and validated concrete colors", async () => {
    const updateTrack = renderSettings();

    await chooseOption("Neurotransmitter", "GLU");
    await chooseOption("Age", "Late childhood");
    updateInput("Top color", "#112233");
    blurInput("Top color");
    updateInput("Bottom color", "#445566");
    blurInput("Bottom color");

    expect(updateTrack.mock.calls).toEqual([
      [{ config: { neurotransmitter: "GLU" } }],
      [{ config: { age: "Late_Childhood" } }],
      [{ config: { topColor: "#112233" } }],
      [{ config: { bottomColor: "#445566" } }],
    ]);
  });
});

function renderSettings(initialConfig = config) {
  const updateTrack = vi.fn<
    (update: TrackUpdate<CaveConfig, CaveTooltipItem>) => TrackMutationResult
  >(() => ({ ok: true }));
  const track = caveModule.create({
    id: "cave",
    title: "CAVE",
    height: 35,
    color: "#3333ff",
    config: initialConfig,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(<CaveSettings track={track} updateTrack={updateTrack} />);
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
