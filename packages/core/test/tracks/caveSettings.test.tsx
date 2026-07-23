// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { TrackMutationResult } from "../../src/modules/types";
import { caveModule } from "../../src/tracks/cave/module";
import { CaveSettings } from "../../src/tracks/cave/settings";
import type { CaveConfig } from "../../src/tracks/cave/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

function Harness() {
  const [config, setConfig] = useState<CaveConfig>(
    () =>
      caveModule.create({
        id: "cave",
        title: "CAVE",
        config: { neurotransmitter: "GABA", age: "Adulthood" },
      }).config,
  );
  const updateConfig = (partial: Partial<CaveConfig>): TrackMutationResult => {
    setConfig((current) => ({ ...current, ...partial }));
    return { ok: true };
  };

  return <CaveSettings id="cave" config={config} updateConfig={updateConfig} />;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("CAVE settings", () => {
  it("updates and clears the top and bottom color overrides", async () => {
    await renderHarness();

    expect(input("Top color").value).toBe("");
    expect(input("Bottom color").value).toBe("");

    await act(async () => setTextInput(input("Top color"), "rebeccapurple"));
    await act(async () => setTextInput(input("Bottom color"), "tomato"));
    expect(input("Top color").value).toBe("rebeccapurple");
    expect(input("Bottom color").value).toBe("tomato");

    await act(async () => setTextInput(input("Top color"), ""));
    await act(async () => setTextInput(input("Bottom color"), ""));
    expect(input("Top color").value).toBe("");
    expect(input("Bottom color").value).toBe("");
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
