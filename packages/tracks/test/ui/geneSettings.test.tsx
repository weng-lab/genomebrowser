// @vitest-environment jsdom

import { act } from "react";
import { geneModule } from "@weng-lab/genomebrowser-tracks/gene";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneSettings } from "../../src/gene/settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("Gene settings", () => {
  it("renders gene highlighting controls and forwards query changes", () => {
    const updateTrack = vi.fn((): { ok: true } => ({ ok: true }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const track = geneModule.create({
      id: "genes",
      title: "Genes",
      config: { url: "YOUR_URL_HERE", geneName: "TP53", highlightColor: "#123456" },
    });

    act(() => root?.render(<GeneSettings track={track} updateTrack={updateTrack} />));

    const input = Array.from(container.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Highlight gene",
    );
    if (!input) throw new Error("Could not find the Highlight gene input");
    expect(input.value).toBe("TP53");
    expect(container.textContent).toContain("Highlight color");

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!valueSetter) throw new Error("Could not set the Highlight gene input value");
    act(() => {
      valueSetter.call(input, "BRCA1");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(updateTrack).toHaveBeenCalledWith({ config: { geneName: "BRCA1" } });
  });
});
