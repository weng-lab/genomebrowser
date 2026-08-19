// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { TrackMutationResult, TrackUpdate } from "@weng-lab/genomebrowser";
import { bigWigModule } from "../../src/bigwig";
import { BigWigSettings } from "../../src/bigwig/settings";
import type { BigWigConfig, RenderedBigWigPoint } from "../../src/bigwig/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let rejectNextUpdate = false;
let acceptedTrack = bigWigModule.create({
  id: "signal",
  title: "Signal",
  config: { url: "YOUR_URL_HERE" },
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  rejectNextUpdate = false;
});

describe("BigWig settings", () => {
  it("commits valid color drafts while retaining invalid drafts and accepted state", async () => {
    const updateTrack = await renderHarness();
    const visibility = input("Show clamp indicators");
    const color = input("Clamp indicator color");

    expect(visibility.checked).toBe(true);
    expect(color.value).toBe("#FF0000");
    expect(color.disabled).toBe(false);

    await act(async () => setTextInput(color, "#663"));
    expect(input("Clamp indicator color").value).toBe("#663");
    expect(acceptedTrack.config.clampIndicatorColor).toBe("#ff0000");

    await act(async () => blurInput(color));
    expect(input("Clamp indicator color").value).toBe("#663");
    expect(input("Clamp indicator color").getAttribute("aria-invalid")).toBe("true");
    expect(container?.textContent).toContain("six-digit");
    expect(acceptedTrack.config.clampIndicatorColor).toBe("#ff0000");

    await act(async () => setTextInput(input("Clamp indicator color"), "#663399"));
    await act(async () => {
      input("Clamp indicator color").dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(input("Clamp indicator color").value).toBe("#663399");
    expect(acceptedTrack.config.clampIndicatorColor).toBe("#663399");

    await act(async () => setTextInput(input("Clamp indicator color"), "#abcdef"));
    rejectNextUpdate = true;
    await act(async () => {
      input("Clamp indicator color").dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(input("Clamp indicator color").value).toBe("#abcdef");
    expect(input("Clamp indicator color").getAttribute("aria-invalid")).toBe("true");
    expect(acceptedTrack.config.clampIndicatorColor).toBe("#663399");

    await act(async () => {
      acceptedTrack = bigWigModule.validate({
        ...acceptedTrack,
        config: { ...acceptedTrack.config, clampIndicatorColor: "#AABBCC" },
      });
      root?.render(<BigWigSettings track={acceptedTrack} updateTrack={updateTrack} />);
    });
    expect(input("Clamp indicator color").value).toBe("#abcdef");
    expect(input("Clamp indicator color").getAttribute("aria-invalid")).toBe("true");
    expect(acceptedTrack.config.clampIndicatorColor).toBe("#AABBCC");

    await act(async () => visibility.click());
    expect(input("Show clamp indicators").checked).toBe(false);
    expect(input("Clamp indicator color").disabled).toBe(true);
    expect(input("Clamp indicator color").value).toBe("#AABBCC");

    await act(async () => input("Show clamp indicators").click());
    expect(input("Show clamp indicators").checked).toBe(true);
    expect(input("Clamp indicator color").disabled).toBe(false);
    expect(input("Clamp indicator color").value).toBe("#AABBCC");
  });
});

async function renderHarness() {
  acceptedTrack = bigWigModule.create({
    id: "signal",
    title: "Signal",
    config: { url: "YOUR_URL_HERE" },
  });
  const updateTrack = (
    update: TrackUpdate<BigWigConfig, RenderedBigWigPoint>,
  ): TrackMutationResult => {
    if (rejectNextUpdate) {
      rejectNextUpdate = false;
      return { ok: false, error: "Rejected for test" };
    }
    acceptedTrack = bigWigModule.validate({
      ...acceptedTrack,
      config: { ...acceptedTrack.config, ...update.config },
    });
    root?.render(<BigWigSettings track={acceptedTrack} updateTrack={updateTrack} />);
    return { ok: true };
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<BigWigSettings track={acceptedTrack} updateTrack={updateTrack} />),
  );
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
