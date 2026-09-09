// @vitest-environment jsdom

import { act } from "react";
import { createTrackStore, type TrackUpdate } from "@weng-lab/genomebrowser";
import {
  geneModule,
  getGeneDatasetsForAssembly,
  getGeneDatasetTitle,
  type GeneConfig,
  type GeneInteractionTarget,
} from "@weng-lab/genomebrowser-tracks/gene";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneSettings } from "../../src/gene/settings";
import { reorderTagColors } from "../../src/gene/settingsHelpers";
import { publishObservedGeneTags } from "../../src/gene/tagCatalog";

const browser = vi.hoisted(() => ({ assemblyId: "hg38" }));

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@weng-lab/genomebrowser")>();
  return {
    ...actual,
    useBrowserStore: <T,>(selector: (state: { assembly: { id: string } }) => T): T =>
      selector({ assembly: { id: browser.assemblyId } }),
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  browser.assemblyId = "hg38";
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
    expect(container.textContent).toContain("Transcript tag");
    expect(container.textContent).toContain("MANE_Select");
    expect(container.textContent).toContain("MANE_Select color");
    expect(container.textContent).toContain("Highlight color");
    expect(container.textContent).not.toContain("Annotation dataset");

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!valueSetter) throw new Error("Could not set the Highlight gene input value");
    act(() => {
      valueSetter.call(input, "BRCA1");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(updateTrack).toHaveBeenCalledWith({ config: { geneName: "BRCA1" } });
  });

  it("selects an assembly-compatible dataset for a host-owned track", () => {
    const updateTrack = vi.fn((): { ok: true } => ({ ok: true }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const track = geneModule.create({
      id: "genes",
      title: "Genes",
      source: "host",
      config: { url: "https://example.org/uncataloged.bb" },
    });

    act(() => root?.render(<GeneSettings track={track} updateTrack={updateTrack} />));

    const datasetInput = Array.from(container.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Annotation dataset",
    );
    const urlInput = Array.from(container.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent?.startsWith("URL"),
    );
    if (!datasetInput || !urlInput) throw new Error("Could not find host dataset controls");
    expect(urlInput.disabled).toBe(true);

    act(() =>
      datasetInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })),
    );
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (candidate) => candidate.textContent === "GENCODE comprehensive",
    );
    if (!option) throw new Error("Could not find the GENCODE comprehensive option");
    act(() => option.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(updateTrack).toHaveBeenCalledWith({
      config: {
        url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v49.comprehensive.annotation.bb",
      },
    });
  });

  it("changes the version within the selected GENCODE variant", () => {
    const updateTrack = vi.fn((): { ok: true } => ({ ok: true }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const track = geneModule.create({
      id: "genes",
      title: "Genes",
      source: "host",
      config: {
        url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v40.basic.annotation.bb",
      },
    });

    act(() => root?.render(<GeneSettings track={track} updateTrack={updateTrack} />));

    const versionInput = Array.from(container.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Version",
    );
    if (!versionInput) throw new Error("Could not find the GENCODE version control");
    expect(versionInput.value).toBe("40");

    act(() =>
      versionInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })),
    );
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (candidate) => candidate.textContent === "46",
    );
    if (!option) throw new Error("Could not find GENCODE version 46");
    act(() => option.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(updateTrack).toHaveBeenCalledWith({
      config: {
        url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v46.basic.annotation.bb",
      },
    });
  });

  it.each([false, true])(
    "switches M25 variants and preserves settings (custom title: %s)",
    (customTitle) => {
      browser.assemblyId = "mm10";
      const [basic, comprehensive] = getGeneDatasetsForAssembly("mm10");
      const track = geneModule.create({
        id: "mouse-genes",
        source: "host",
        title: customTitle ? "My mouse genes" : getGeneDatasetTitle(basic),
        display: "merged",
        color: "#123456",
        height: 72,
        config: {
          url: basic.url,
          geneName: "Xkr4",
          rowHeight: 18,
          tagColors: [{ tag: "basic", color: "#abcdef" }],
        },
      });
      const useTrackStore = createTrackStore({ modules: [geneModule], tracks: [track] });
      const updateTrack = (update: TrackUpdate<GeneConfig, GeneInteractionTarget>) =>
        useTrackStore.getState().updateTrack(track.base.id, update);
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      const renderSettings = () =>
        root?.render(
          <GeneSettings
            track={geneModule.validate(useTrackStore.getState().getTrack(track.base.id))}
            updateTrack={updateTrack}
          />,
        );
      act(renderSettings);
      const inputs = Array.from(container.querySelectorAll<HTMLInputElement>("input"));
      expect(inputs.find((input) => input.labels?.[0]?.textContent === "Version")?.value).toBe(
        "M25",
      );
      const datasetInput = inputs.find(
        (input) => input.labels?.[0]?.textContent === "Annotation dataset",
      )!;
      act(() =>
        datasetInput.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
        ),
      );
      const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
        (candidate) => candidate.textContent === "GENCODE comprehensive",
      )!;
      act(() => option.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      act(renderSettings);
      const updated = useTrackStore.getState().getTrack(track.base.id)!;
      expect(updated.config).toEqual({ ...track.config, url: comprehensive.url });
      expect(updated.base).toEqual({
        ...track.base,
        title: customTitle ? track.base.title : getGeneDatasetTitle(comprehensive),
      });
      const restored = geneModule.validate(JSON.parse(JSON.stringify(updated)));
      expect(restored).toEqual(updated);
      expect(
        Array.from(container.querySelectorAll<HTMLInputElement>("input")).find(
          (input) => input.labels?.[0]?.textContent === "Annotation dataset",
        )?.value,
      ).toBe("GENCODE comprehensive");
    },
  );

  it("shows an empty state for an unsupported assembly", () => {
    browser.assemblyId = "mm39";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const updateTrack = vi.fn((): { ok: true } => ({ ok: true }));
    const track = geneModule.create({
      id: "genes",
      title: "Genes",
      source: "host",
      config: { url: "YOUR_URL_HERE" },
    });
    act(() => root?.render(<GeneSettings track={track} updateTrack={updateTrack} />));
    expect(container.textContent).toContain("No datasets available for mm39.");
    const input = Array.from(container.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Annotation dataset",
    )!;
    expect(input.disabled).toBe(true);
    expect(updateTrack).not.toHaveBeenCalled();
  });

  it("adds an observed tag with its own color", () => {
    const updateTrack = vi.fn((): { ok: true } => ({ ok: true }));
    const url = "https://example.org/settings-tags.bb";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const track = geneModule.create({
      id: "genes",
      title: "Genes",
      config: { url },
    });

    act(() => root?.render(<GeneSettings track={track} updateTrack={updateTrack} />));
    act(() => publishObservedGeneTags(url, ["Ensembl_canonical", "MANE_Select"]));
    const addButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Add tag",
    );
    if (!addButton) throw new Error("Could not find the add tag button");
    act(() => addButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    const selectorInput = Array.from(container.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Transcript tag" && !candidate.value,
    );
    if (!selectorInput) throw new Error("Could not find the new tag selector input");
    act(() =>
      selectorInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      ),
    );

    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (candidate) => candidate.textContent === "Ensembl_canonical",
    );
    if (!option) throw new Error("Could not find the observed Ensembl_canonical option");
    act(() => option.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(updateTrack).toHaveBeenCalledWith({
      config: {
        tagColors: [
          { tag: "MANE_Select", color: "#000000" },
          { tag: "Ensembl_canonical", color: "#000000" },
        ],
      },
    });
  });

  it("renders pointer drag handles and reorders tag color priority", () => {
    const updateTrack = vi.fn((): { ok: true } => ({ ok: true }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const track = geneModule.create({
      id: "genes",
      title: "Genes",
      config: {
        url: "YOUR_URL_HERE",
        tagColors: [
          { tag: "MANE_Select", color: "#112233" },
          { tag: "basic", color: "#445566" },
        ],
      },
    });

    act(() => root?.render(<GeneSettings track={track} updateTrack={updateTrack} />));
    const firstHandle = container.querySelector('[data-tag-drag-handle="MANE_Select"]');
    const secondHandle = container.querySelector('[data-tag-drag-handle="basic"]');
    if (!firstHandle || !secondHandle) throw new Error("Could not find tag drag handles");
    expect(firstHandle.hasAttribute("draggable")).toBe(false);
    expect(reorderTagColors(track.config.tagColors, "MANE_Select", "basic")).toEqual([
      { tag: "basic", color: "#445566" },
      { tag: "MANE_Select", color: "#112233" },
    ]);
  });
});
