// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrackMutationResult, TrackUpdate } from "@weng-lab/genomebrowser";
import { caveModule } from "../../src/cave";
import { CaveSettings } from "../../src/cave/settings";
import type { CaveConfig, CaveTooltipItem } from "../../src/cave/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("CAVE settings", () => {
  it("updates concrete top and bottom colors", async () => {
    const updateTrack = await renderSettings();

    expect(input("Top color").value).toBe("#000000");
    expect(input("Bottom color").value).toBe("#000000");

    await act(async () => setTextInput(input("Top color"), "#112233"));
    await act(async () => blurInput(input("Top color")));
    await act(async () => setTextInput(input("Bottom color"), "#445566"));
    await act(async () => blurInput(input("Bottom color")));
    expect(input("Top color").value).toBe("#112233");
    expect(input("Bottom color").value).toBe("#445566");
    expect(updateTrack.mock.calls).toEqual([
      [{ config: { topColor: "#112233" } }],
      [{ config: { bottomColor: "#445566" } }],
    ]);
  });
});

async function renderSettings() {
  const track = caveModule.create({
    id: "cave",
    title: "CAVE",
    config: { neurotransmitter: "GABA", age: "Adulthood" },
  });
  const updateTrack = vi.fn<
    (update: TrackUpdate<CaveConfig, CaveTooltipItem>) => TrackMutationResult
  >(() => ({ ok: true }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(<CaveSettings track={track} updateTrack={updateTrack} />));
  return updateTrack;
}

function input(label: string) {
  const candidate = Array.from(container?.querySelectorAll<HTMLInputElement>("input") ?? []).find(
    (input) =>
      Array.from(input.labels ?? []).some((element) => element.textContent?.includes(label)),
  );
  if (!candidate) throw new Error(`Input not found: ${label}`);
  return candidate;
}

function setTextInput(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function blurInput(element: HTMLInputElement) {
  element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
}
