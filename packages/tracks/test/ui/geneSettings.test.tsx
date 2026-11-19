// @vitest-environment jsdom

import {
  geneModule,
  getGeneDatasetsForAssembly,
  getGeneDatasetTitle,
  type GeneCreateInput,
} from "@weng-lab/genomebrowser-tracks/gene";
import { afterEach, describe, expect, it } from "vitest";
import { reorderTagColors } from "../../src/gene/settings/reorderTagColors";
import { publishObservedGeneTags } from "../../src/gene/data/tagCatalog";
import { mountTrack, type MountedTrack } from "../mountTrack";

let view: MountedTrack | undefined;
let container: HTMLDialogElement | undefined;

afterEach(async () => {
  await view?.unmount();
  view = undefined;
  container = undefined;
});

/** Mounts a gene track in a browser on `assemblyId` and opens its settings like a user. */
async function openGeneSettings(track: GeneCreateInput, assemblyId = "hg38") {
  view = await mountTrack({
    module: geneModule,
    track,
    data: [],
    region: { chromosome: "chr1", start: 0, end: 1000 },
    assembly: { id: assemblyId, chromosomes: { chr1: 248_956_422 } },
  });
  container = await view.openSettings();
  const mounted = view;
  /** The track the browser stores after the panel's updates. */
  return () => geneModule.validate(mounted.trackStore.getState().getTrack(track.base.id));
}
const act = (update: () => unknown) => view!.settle(update);
describe("Gene settings", () => {
  it("renders gene highlighting controls and forwards query changes", async () => {
    const stored = await openGeneSettings({
      base: {
        id: "genes",
        title: "Genes",
      },
      config: { url: "YOUR_URL_HERE", geneName: "TP53", highlightColor: "#123456" },
    });

    const input = Array.from(container!.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Highlight gene",
    );
    if (!input) throw new Error("Could not find the Highlight gene input");
    expect(input.value).toBe("TP53");
    expect(container!.textContent).toContain("Transcript tag");
    expect(container!.textContent).toContain("MANE_Select");
    expect(container!.textContent).toContain("MANE_Select color");
    expect(container!.textContent).toContain("Highlight color");
    expect(container!.textContent).not.toContain("Annotation dataset");

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!valueSetter) throw new Error("Could not set the Highlight gene input value");
    await act(() => {
      valueSetter.call(input, "BRCA1");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(stored().config.geneName).toBe("BRCA1");
  });

  it("selects an assembly-compatible dataset for a host-owned track", async () => {
    const stored = await openGeneSettings({
      base: {
        id: "genes",
        title: "Genes",
      },
      source: "host",
      config: { url: "https://example.org/uncataloged.bb" },
    });

    const datasetInput = Array.from(container!.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Annotation dataset",
    );
    const urlInput = Array.from(container!.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent?.startsWith("URL"),
    );
    if (!datasetInput || !urlInput) throw new Error("Could not find host dataset controls");
    expect(urlInput.disabled).toBe(true);

    await act(() =>
      datasetInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })),
    );
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (candidate) => candidate.textContent === "GENCODE comprehensive",
    );
    if (!option) throw new Error("Could not find the GENCODE comprehensive option");
    await act(() => option.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(stored().config.url).toBe(
      "https://users.wenglab.org/niship/gencodefiles/human.gencode.v49.comprehensive.annotation.bb",
    );
  });

  it("changes the version within the selected GENCODE variant", async () => {
    const stored = await openGeneSettings({
      base: {
        id: "genes",
        title: "Genes",
      },
      source: "host",
      config: {
        url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v40.basic.annotation.bb",
      },
    });

    const versionInput = Array.from(container!.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Version",
    );
    if (!versionInput) throw new Error("Could not find the GENCODE version control");
    expect(versionInput.value).toBe("40");

    await act(() =>
      versionInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })),
    );
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (candidate) => candidate.textContent === "46",
    );
    if (!option) throw new Error("Could not find GENCODE version 46");
    await act(() => option.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(stored().config.url).toBe(
      "https://users.wenglab.org/niship/gencodefiles/human.gencode.v46.basic.annotation.bb",
    );
  });

  it.each([false, true])(
    "switches M25 variants and preserves settings (custom title: %s)",
    async (customTitle) => {
      const [basic, comprehensive] = getGeneDatasetsForAssembly("mm10");
      const input = {
        base: {
          id: "mouse-genes",
          title: customTitle ? "My mouse genes" : getGeneDatasetTitle(basic),
          display: "merged",
          color: "#123456",
          height: 72,
        },
        source: "host",
        config: {
          url: basic.url,
          geneName: "Xkr4",
          rowHeight: 18,
          tagColors: [{ tag: "basic", color: "#abcdef" }],
        },
      } satisfies GeneCreateInput;
      const track = geneModule.create(input);
      const stored = await openGeneSettings(input, "mm10");
      // In a mounted browser the renderer owns the height; the switch must keep it.
      const { height } = stored().base;
      const inputs = Array.from(container!.querySelectorAll<HTMLInputElement>("input"));
      expect(inputs.find((input) => input.labels?.[0]?.textContent === "Version")?.value).toBe(
        "M25",
      );
      const datasetInput = inputs.find(
        (input) => input.labels?.[0]?.textContent === "Annotation dataset",
      )!;
      await act(() =>
        datasetInput.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
        ),
      );
      const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
        (candidate) => candidate.textContent === "GENCODE comprehensive",
      )!;
      await act(() => option.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      const updated = stored();
      expect(updated.config).toEqual({ ...track.config, url: comprehensive.url });
      expect(updated.base).toEqual({
        ...track.base,
        height,
        title: customTitle ? track.base.title : getGeneDatasetTitle(comprehensive),
      });
      const restored = geneModule.validate(JSON.parse(JSON.stringify(updated)));
      expect(restored).toEqual(updated);
      expect(
        Array.from(container!.querySelectorAll<HTMLInputElement>("input")).find(
          (input) => input.labels?.[0]?.textContent === "Annotation dataset",
        )?.value,
      ).toBe("GENCODE comprehensive");
    },
  );

  it("shows an empty state for an unsupported assembly", async () => {
    const stored = await openGeneSettings(
      {
        base: {
          id: "genes",
          title: "Genes",
        },
        source: "host",
        config: { url: "YOUR_URL_HERE" },
      },
      "mm39",
    );
    expect(container!.textContent).toContain("No datasets available for mm39.");
    const input = Array.from(container!.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Annotation dataset",
    )!;
    expect(input.disabled).toBe(true);
    expect(stored().config.url).toBe("YOUR_URL_HERE");
  });

  it("adds an observed tag with its own color", async () => {
    const url = "https://example.org/settings-tags.bb";
    const stored = await openGeneSettings({
      base: {
        id: "genes",
        title: "Genes",
      },
      config: { url },
    });
    await act(() => publishObservedGeneTags(url, ["Ensembl_canonical", "MANE_Select"]));
    const addButton = Array.from(container!.querySelectorAll("button")).find(
      (button) => button.textContent === "Add tag",
    );
    if (!addButton) throw new Error("Could not find the add tag button");
    await act(() => addButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    const selectorInput = Array.from(container!.querySelectorAll<HTMLInputElement>("input")).find(
      (candidate) => candidate.labels?.[0]?.textContent === "Transcript tag" && !candidate.value,
    );
    if (!selectorInput) throw new Error("Could not find the new tag selector input");
    await act(() =>
      selectorInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      ),
    );

    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (candidate) => candidate.textContent === "Ensembl_canonical",
    );
    if (!option) throw new Error("Could not find the observed Ensembl_canonical option");
    await act(() => option.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(stored().config.tagColors).toEqual([
      { tag: "MANE_Select", color: "#000000" },
      { tag: "Ensembl_canonical", color: "#000000" },
    ]);
  });

  it("renders pointer drag handles and reorders tag color priority", async () => {
    const stored = await openGeneSettings({
      base: {
        id: "genes",
        title: "Genes",
      },
      config: {
        url: "YOUR_URL_HERE",
        tagColors: [
          { tag: "MANE_Select", color: "#112233" },
          { tag: "basic", color: "#445566" },
        ],
      },
    });
    const firstHandle = container!.querySelector('[data-tag-drag-handle="MANE_Select"]');
    const secondHandle = container!.querySelector('[data-tag-drag-handle="basic"]');
    if (!firstHandle || !secondHandle) throw new Error("Could not find tag drag handles");
    expect(firstHandle.hasAttribute("draggable")).toBe(false);
    expect(reorderTagColors(stored().config.tagColors, "MANE_Select", "basic")).toEqual([
      { tag: "basic", color: "#445566" },
      { tag: "MANE_Select", color: "#112233" },
    ]);
  });
});
