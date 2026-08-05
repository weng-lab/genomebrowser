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
    expect(getInput("Canonical color").value).toBe(config.canonicalColor);
    expect(getInput("Highlight color").value).toBe(config.highlightColor);
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
    updateInput("Highlight color", "");
    updateInput("Version", "4.5");

    expect(updateConfig.mock.calls).toEqual([
      [{ assembly: "GRCh37" }],
      [{ version: 41 }],
      [{ geneName: undefined }],
      [{ canonicalColor: undefined }],
      [{ highlightColor: undefined }],
    ]);
  });
});

function renderSettings() {
  const updateConfig = vi.fn((): { ok: true } => ({ ok: true }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(<TranscriptSettings id="genes" config={config} updateConfig={updateConfig} />);
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

function updateInput(label: string, value: string) {
  const input = getInput(label);
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) throw new Error("Input value setter is unavailable");
  act(() => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
