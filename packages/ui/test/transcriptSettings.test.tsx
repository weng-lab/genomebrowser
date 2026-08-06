// @vitest-environment jsdom

import {
  createTrackStore,
  defaultScreenGraphQlEndpoint,
  transcriptModule,
  type TrackMutationResult,
  type TrackUpdate,
  type TranscriptConfig,
} from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TranscriptSettings } from "../src/tracks/transcript/settings";
import { TrackSettingsTestProvider } from "./trackSettingsTestProvider";

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal()),
  ...(await import("../../core/src/browser/state/browserContextState")),
}));

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

  it("updates typed values and the optional gene name", () => {
    vi.useFakeTimers();
    const updateTrack = renderSettings();

    updateInput("Endpoint", "");
    updateInput("Assembly", "GRCh37");
    updateInput("Version", "41");
    act(() => vi.advanceTimersByTime(300));
    updateInput("Highlight gene", "");
    updateInput("Canonical color", "#112233");
    blurInput("Canonical color");
    updateInput("Highlight color", "#445566");
    blurInput("Highlight color");
    updateInput("Version", "4.5");

    expect(updateTrack.mock.calls).toEqual([
      [{ config: { assembly: "GRCh37" } }],
      [{ config: { version: 41 } }],
      [{ config: { geneName: undefined } }],
      [{ config: { canonicalColor: "#112233" } }],
      [{ config: { highlightColor: "#445566" } }],
    ]);
  });
});

function renderSettings(initialConfig = config) {
  const updateTrack = vi.fn<(update: TrackUpdate<TranscriptConfig>) => TrackMutationResult>(() => ({
    ok: true,
  }));
  const trackStore = createTrackStore({
    modules: [transcriptModule],
    tracks: [
      transcriptModule.create({
        id: "genes",
        title: "Genes",
        height: 90,
        color: "#7a4fb3",
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
        trackId="genes"
        trackStore={trackStore}
        updateTrack={(update) => updateTrack(update as TrackUpdate<TranscriptConfig>)}
      >
        <TranscriptSettings />
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
