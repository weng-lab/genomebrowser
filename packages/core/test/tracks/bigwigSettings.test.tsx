// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { TrackMutationResult } from "../../src/modules/types";
import { bigWigModule } from "../../src/tracks/bigwig/module";
import { BigWigSettings } from "../../src/tracks/bigwig/settings";
import type { BigWigConfig } from "../../src/tracks/bigwig/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

function Harness() {
  const [config, setConfig] = useState<BigWigConfig>(
    () =>
      bigWigModule.create({
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      }).config,
  );
  const updateConfig = (partial: Partial<BigWigConfig>): TrackMutationResult => {
    setConfig((current) => ({ ...current, ...partial }));
    return { ok: true };
  };

  return <BigWigSettings id="signal" config={config} updateConfig={updateConfig} />;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("BigWig settings", () => {
  it("updates visibility and color while retaining color across visibility toggles", async () => {
    await renderHarness();
    const visibility = input("Show clamp indicators");
    const color = input("Clamp indicator color");

    expect(visibility.checked).toBe(true);
    expect(color.value).toBe("#ff0000");
    expect(color.disabled).toBe(false);

    await act(async () => setTextInput(color, "rebeccapurple"));
    expect(input("Clamp indicator color").value).toBe("rebeccapurple");

    await act(async () => visibility.click());
    expect(input("Show clamp indicators").checked).toBe(false);
    expect(input("Clamp indicator color").disabled).toBe(true);
    expect(input("Clamp indicator color").value).toBe("rebeccapurple");

    await act(async () => input("Show clamp indicators").click());
    expect(input("Show clamp indicators").checked).toBe(true);
    expect(input("Clamp indicator color").disabled).toBe(false);
    expect(input("Clamp indicator color").value).toBe("rebeccapurple");
  });
});

async function renderHarness() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness />));
}

function input(label: string) {
  const candidate = Array.from(container?.querySelectorAll("label") ?? [])
    .find((element) => element.textContent?.includes(label))
    ?.querySelector("input");
  if (!(candidate instanceof HTMLInputElement)) throw new Error(`Input not found: ${label}`);
  return candidate;
}

function setTextInput(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}
