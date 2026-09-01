// @vitest-environment jsdom

import { createBrowserStore, type GenomicRegion, type Highlight } from "@weng-lab/genomebrowser";
import type { Cytoband } from "@weng-lab/genomic-reader";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cytobands, type CytobandColors, type CytobandsProps } from "../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let getBBoxDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  getBBoxDescriptor = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  if (getBBoxDescriptor) {
    Object.defineProperty(SVGElement.prototype, "getBBox", getBBoxDescriptor);
  } else {
    delete (SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox;
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Cytobands rendering", () => {
  it("renders supplied reader cytobands synchronously without making a network call", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render({
      chromosome: "chrSync",
      chromosomeLength: 100,
      bands: cytobands("chrSync"),
      width: 500,
      height: 24,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container?.querySelector('[data-stain="gneg"]')).not.toBeNull();
    expect(container?.querySelector("svg")?.getAttribute("aria-label")).toBe(
      "Chromosome chrSync ideogram",
    );
    expect(container?.querySelector("svg")?.getAttribute("role")).toBe("img");
    expect(container?.querySelector('[role="status"]')).toBeNull();
    expect(container?.textContent).not.toContain("Loading");
  });

  it("uses the full chromosome extent and safely filters, sorts, and clips supplied bands", () => {
    const chromosome = "chrGeometry";
    const bands = [
      band(chromosome, 600, 700, "q3", "mystery"),
      band(chromosome, 400, 500, "p11", "acen"),
      band(chromosome, 200, 300, "p2", "gpos75"),
      band(chromosome, 100, 200, "p1", "gneg"),
      band(chromosome, 300, 350, "p3", "gvar"),
      band(chromosome, 350, 400, "p12", "stalk"),
      band(chromosome, 500, 600, "q11", "acen"),
      band(chromosome, -100, 50, "clipped-left", "gneg"),
      band(chromosome, 900, 1_100, "clipped-right", "gneg"),
      band(chromosome, 800, 700, "reversed", "gneg"),
      band("chrOther", 0, 100, "mismatch", "gneg"),
    ] satisfies readonly Cytoband[];

    render({ chromosome, chromosomeLength: 1_000, bands, width: 1_000, height: 30 });

    const renderedBands = [...(container?.querySelectorAll("[data-stain]") ?? [])];
    expect(renderedBands.map((item) => item.getAttribute("data-stain"))).toEqual([
      "gneg",
      "gneg",
      "gpos75",
      "gvar",
      "stalk",
      "acen",
      "acen",
      "mystery",
      "gneg",
    ]);
    expect(renderedBands.every(hasFiniteGeometry)).toBe(true);
    expectGeometry('[data-stain="gvar"]', { x: "300", width: "50", y: "3", height: "24" });
    const negativeBands = container?.querySelectorAll('[data-stain="gneg"]');
    expectGeometryWithin(negativeBands?.[0], { x: "0", width: "50" });
    expectGeometryWithin(negativeBands?.[2], { x: "900", width: "100" });
    const centromeres = container?.querySelectorAll('[data-stain="acen"]');
    expect(centromeres?.[0]?.getAttribute("d")).toBe("M 400 3 L 500 15 L 400 27 Z");
    expect(centromeres?.[1]?.getAttribute("d")).toBe("M 600 3 L 500 15 L 600 27 Z");
    expect(container?.querySelector('[data-stain="gpos75"]')?.getAttribute("fill-opacity")).toBe(
      "0.75",
    );
    expect(container?.querySelector('[data-stain="mystery"]')?.getAttribute("fill")).toBe(
      "#b8b8b8",
    );
    expect(
      container?.querySelector('[data-testid="cytobands"]')?.getAttribute("clip-path"),
    ).toMatch(/^url\(#chromosome-ideogram-/);
  });

  it("updates supplied data, dimensions, and colors synchronously", () => {
    const chromosome = "chrUpdates";
    const colors: Partial<CytobandColors> = { stalk: "#123456" };
    render({
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
    });
    render({
      chromosome,
      chromosomeLength: 200,
      bands: [band(chromosome, 50, 100, "p1", "stalk")],
      colors,
      width: 400,
      height: 30,
    });

    expect(container?.querySelector('[data-stain="gneg"]')).toBeNull();
    expectGeometry('[data-stain="stalk"]', { x: "100", width: "100", y: "3", height: "24" });
    expect(container?.querySelector('[data-stain="stalk"]')?.getAttribute("fill")).toBe("#123456");
    expect(container?.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 400 30");
  });

  it("keeps invalid dimensions and chromosome lengths finite", () => {
    render({
      chromosome: "chrInvalid",
      chromosomeLength: Number.NaN,
      bands: cytobands("chrInvalid"),
      width: Number.POSITIVE_INFINITY,
      height: -10,
    });

    expect(container?.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 0 0");
    expect(container?.querySelector("[data-stain]")).toBeNull();
    expect(container?.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("renders bands and highlights without an enclosing outline", () => {
    const chromosome = "chrNoOutline";
    render({
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
      highlights: [highlight("visible", 10, 30)],
    });

    expect(container?.querySelector('[data-stain="gneg"]')).not.toBeNull();
    expect(
      getHighlight("visible").querySelector('[data-testid="highlight-visual"]'),
    ).not.toBeNull();
    expect(container?.querySelector('svg > rect[fill="none"]')).toBeNull();
  });
});

describe("Cytobands highlights", () => {
  it("filters and clips highlights against the full chromosome extent", () => {
    const chromosome = "chrHighlightGeometry";
    const highlights: readonly Highlight[] = [
      highlight("inherited", 10, 30, undefined, "#111111"),
      highlight("matching", 50, 51, chromosome, "#222222", 0.4),
      highlight("mismatch", 20, 40, "chrOther"),
      highlight("empty", 20, 20),
      highlight("reversed", 40, 30),
      highlight("malformed", Number.NaN, 50),
      highlight("clipped-left", -10, 10),
      highlight("clipped-right", 90, 120),
      highlight("outside-left", -20, -10),
      highlight("outside-right", 100, 110),
    ];

    render({
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
      highlights,
    });

    expect(renderedHighlightIds()).toEqual([
      "clipped-left",
      "inherited",
      "matching",
      "clipped-right",
    ]);
    expectHighlightGeometry("clipped-left", "interval", { x: "0", width: "20" });
    expectHighlightGeometry("clipped-right", "interval", { x: "180", width: "20" });
    expectHighlightGeometry("inherited", "interval", { x: "20", width: "40" });
    expectHighlightGeometry("matching", "marker", { x: "100", width: "2" });
    const marker = getHighlight("matching");
    expectGeometryWithin(marker.querySelector('[data-testid="highlight-hit-target"]'), {
      x: "95",
      width: "12",
    });
    expect(marker.querySelector('[data-testid="highlight-visual"]')?.getAttribute("fill")).toBe(
      "#222222",
    );
    expect(
      marker.querySelector('[data-testid="highlight-visual"]')?.getAttribute("fill-opacity"),
    ).toBe("0.4");
  });

  it("defaults missing opacity and orders overlaps without replacing stable IDs", () => {
    const chromosome = "chrHighlightOrder";
    const alpha = highlight("alpha", 20, 50, chromosome);
    const beta = highlight("beta", 20, 50, chromosome, "#336699", 0);
    const base = {
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
    };

    render({ ...base, highlights: [beta, alpha] });
    const alphaElement = getHighlight("alpha");
    expect(renderedHighlightIds()).toEqual(["alpha", "beta"]);
    expect(highlightOpacity("alpha")).toBe("0.2");
    expect(highlightOpacity("beta")).toBe("0");

    render({ ...base, highlights: [alpha, beta] });
    expect(getHighlight("alpha")).toBe(alphaElement);
  });

  it.each([
    ["interval", highlight("interactive-wide", 10, 30)],
    ["marker", highlight("interactive-narrow", 50, 51)],
  ] as const)("gives the %s equivalent pointer and keyboard behavior", (_, item) => {
    const chromosome = `chrInteraction${item.id}`;
    const onPointerEnter = vi.fn();
    const onPointerLeave = vi.fn();
    const onClick = vi.fn();
    render({
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
      highlights: [item],
      onHighlightClick: onClick,
      onHighlightPointerEnter: onPointerEnter,
      onHighlightPointerLeave: onPointerLeave,
    });
    const element = getHighlight(item.id);

    expect(element.getAttribute("role")).toBe("button");
    expect(element.getAttribute("tabindex")).toBe("0");
    expect(element.closest('[role="group"]')).toBe(container?.querySelector("svg"));
    dispatchPointer(element, "pointerover", { clientX: 100, clientY: 80 });
    expect(onPointerEnter.mock.calls[0]?.[0]).toBe(item);
    expect(onPointerEnter.mock.calls[0]?.[1].type).toBe("pointerenter");
    expect(getTooltip().textContent).toBe(
      `${chromosome}: ${coordinate(item.region.start)}–${coordinate(item.region.end)}`,
    );
    expect(getTooltip().namespaceURI).toBe("http://www.w3.org/2000/svg");
    const tooltipId = getTooltip().id;
    expect(tooltipId).toMatch(/^cytobands-highlight-tooltip-/);
    expect(element.getAttribute("aria-describedby")).toBe(tooltipId);
    expect(getTooltipPortal().parentElement).toBe(document.body);
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    expect(container?.querySelector("foreignObject")).toBeNull();
    dispatchPointer(element, "pointerout");
    expect(onPointerLeave.mock.calls[0]?.[0]).toBe(item);
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    expect(element.hasAttribute("aria-describedby")).toBe(false);

    dispatch(element, "focusin");
    expect(getTooltip().id).toBe(tooltipId);
    expect(element.getAttribute("aria-describedby")).toBe(tooltipId);
    dispatchKey(element, "Escape");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    expect(element.hasAttribute("aria-describedby")).toBe(false);
    dispatch(element, "focusout");

    dispatch(element, "focusin");
    expect(getTooltip().id).toBe(tooltipId);
    dispatch(element, "focusout");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    dispatch(element, "focusin");
    dispatchKey(element, "Enter");
    dispatchKey(element, " ");
    dispatchKey(element, "Enter", true);
    dispatchPointer(element, "pointerover");
    dispatch(element, "click");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    expect(onClick).toHaveBeenCalledTimes(3);
    expect(onClick.mock.calls.map(([, event]) => event.type)).toEqual([
      "keydown",
      "keydown",
      "click",
    ]);
  });

  it("keeps one custom tooltip active and cleans it up as interaction ownership changes", () => {
    const chromosome = "chrTooltipLifecycle";
    const first = highlight("first", 10, 20);
    const second = highlight("second", 60, 70);
    const renderTooltip = vi.fn((item: Highlight) => (
      <text>{`custom-${item.id}-${item.color}`}</text>
    ));
    const base = {
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
      renderHighlightTooltip: renderTooltip,
      onHighlightClick: vi.fn(),
    };
    render({ ...base, highlights: [first, second] });
    expect(renderTooltip).not.toHaveBeenCalled();

    dispatchPointer(getHighlight("first"), "pointerover");
    expect(getTooltip().textContent).toBe("custom-first-#336699");
    dispatchPointer(getHighlight("second"), "pointerover");
    expect(document.body.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
    expect(getTooltip().textContent).toBe("custom-second-#336699");
    dispatchPointer(getHighlight("first"), "pointerout");
    expect(getTooltip().textContent).toBe("custom-second-#336699");
    dispatchPointer(getHighlight("second"), "pointerout");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    const changedFirst = { ...first, color: "#abcdef" } satisfies Highlight;
    render({ ...base, highlights: [changedFirst, second] });
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    dispatchPointer(getHighlight("first"), "pointerover");
    expect(getTooltip().textContent).toBe("custom-first-#abcdef");
    render({ ...base, highlights: [second] });
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("uses a fixed theme-aware portal and flips or clamps it within the viewport", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(800);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(600);
    mockGetBBox(() => svgRect({ x: 0, y: 0, width: 100, height: 20 }));
    const theme = createTheme({
      cssVariables: true,
      palette: {
        background: { paper: "#123456" },
        divider: "#abcdef",
        text: { primary: "#fedcba" },
      },
      shape: { borderRadius: 7 },
      typography: {
        caption: {
          fontFamily: "Tooltip Test",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.02em",
          lineHeight: 1.4,
        },
      },
      zIndex: { tooltip: 4321 },
    });
    const chromosome = "chrPortalTooltip";
    renderNode(
      <ThemeProvider theme={theme}>
        <Cytobands
          bands={cytobands(chromosome)}
          chromosome={chromosome}
          chromosomeLength={100}
          height={20}
          highlights={[highlight("portal", 10, 20)]}
          width={200}
        />
      </ThemeProvider>,
    );

    dispatchPointer(getHighlight("portal"), "pointerover", { clientX: 799, clientY: 599 });
    const portal = getTooltipPortal();
    const tooltip = getTooltip();
    const shell = tooltip.querySelector("rect");
    const content = tooltip.querySelector('[data-testid="highlight-tooltip-content"] > g');
    expect(portal.parentElement).toBe(document.body);
    expect(portal.style.position).toBe("fixed");
    expect(portal.style.pointerEvents).toBe("none");
    expect(portal.style.zIndex).toBe("4321");
    expect(portal.getAttribute("pointer-events")).toBe("none");
    expect(tooltip.getAttribute("pointer-events")).toBe("none");
    expect(tooltip.getAttribute("transform")).toBe("translate(671 555)");
    expectGeometryWithin(shell, {
      fill: "var(--mui-palette-background-paper)",
      stroke: "var(--mui-palette-divider)",
      rx: "7",
    });
    expect(shell?.getAttribute("style")).toContain("drop-shadow");
    expectGeometryWithin(content, {
      fill: "var(--mui-palette-text-primary)",
    });
    expect(content?.getAttribute("style")).toContain("font: var(--mui-font-caption");
    expect(content?.getAttribute("style")).toContain("letter-spacing: 0.02em");

    dispatchPointer(getHighlight("portal"), "pointerout");
    dispatchPointer(getHighlight("portal"), "pointerover", { clientX: -30, clientY: -20 });
    expect(getTooltip().getAttribute("transform")).toBe("translate(8 8)");
  });

  it("constrains and clips oversized tooltip content to the viewport margins", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(200);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(100);
    mockGetBBox(() => svgRect({ x: 0, y: 0, width: 500, height: 300 }));
    const chromosome = "chrOversizedTooltip";
    render({
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
      highlights: [highlight("oversized", 10, 20)],
      renderHighlightTooltip: () => <text>Oversized content</text>,
    });

    dispatchPointer(getHighlight("oversized"), "pointerover", { clientX: 100, clientY: 50 });
    const tooltip = getTooltip();
    const shell = tooltip.querySelector("rect");
    const clip = getTooltipPortal().querySelector('[data-testid="highlight-tooltip-content-clip"]');
    const clipBounds = clip?.querySelector("rect");
    const content = tooltip.querySelector('[data-testid="highlight-tooltip-content"]');
    expect(tooltip.getAttribute("transform")).toBe("translate(8 8)");
    expectGeometryWithin(shell, { width: "184", height: "84" });
    expectGeometryWithin(clipBounds, { x: "10", y: "8", width: "164", height: "68" });
    expect(content?.getAttribute("clip-path")).toBe(`url(#${tooltip.id}-content-clip)`);
  });

  it("measures custom SVG tooltip content and reacts to its rendered size", async () => {
    const chromosome = "chrMeasuredTooltip";
    let setTooltipText: ((value: string) => void) | undefined;
    function ChangingTooltip() {
      const [text, setText] = useState("short");
      setTooltipText = setText;
      return <text>{text}</text>;
    }
    mockGetBBox(function () {
      return svgRect({
        x: 0,
        y: -10,
        width: this.textContent === "short" ? 30 : 90,
        height: 12,
      });
    });
    render({
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
      highlights: [highlight("changing", 40, 60)],
      renderHighlightTooltip: () => <ChangingTooltip />,
    });

    dispatchPointer(getHighlight("changing"), "pointerover");
    expectGeometryWithin(getTooltip().querySelector("rect"), { width: "50", height: "28" });
    act(() => setTooltipText?.("substantially longer"));
    await flushMutationObserver();
    expectGeometryWithin(getTooltip().querySelector("rect"), { width: "110", height: "28" });
  });

  it("does not make passive highlights focusable", () => {
    const chromosome = "chrNonClickable";
    render({
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
      highlights: [highlight("passive", 10, 20)],
    });

    const element = getHighlight("passive");
    expect(element.hasAttribute("tabindex")).toBe(false);
    expect(element.hasAttribute("role")).toBe(false);
    dispatch(element, "focusin");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    expect(element.hasAttribute("aria-describedby")).toBe(false);
    expect(container?.querySelector("svg")?.getAttribute("role")).toBe("img");
  });
});

describe("Cytobands current region", () => {
  it("renders wide and minimum-width accessible bracket geometry", () => {
    const chromosome = "chrCurrentGeometry";
    const base = {
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
    };

    render({ ...base, currentRegion: { chromosome, start: 10, end: 30 } });
    let bracket = getCurrentRegionBracket();
    expect(bracket.getAttribute("pointer-events")).toBe("none");
    expect(bracket.getAttribute("role")).toBe("img");
    expect(bracket.getAttribute("aria-label")).toBe(`Current region ${chromosome}: 10–30`);
    expect(bracket.closest("svg")?.getAttribute("role")).toBe("group");
    expectBoundaryPoints("left", "23,0 20,0 20,20 23,20");
    expectBoundaryPoints("right", "57,0 60,0 60,20 57,20");

    render({ ...base, currentRegion: { chromosome, start: 50, end: 51 } });
    bracket = getCurrentRegionBracket();
    expectBoundaryPoints("left", "100,0 97,0 97,20 100,20");
    expectBoundaryPoints("right", "102,0 105,0 105,20 102,20");
    expect(bracket.querySelectorAll('[fill="none"][stroke="#1976d2"]')).toHaveLength(2);
  });

  it("clips partial regions and suppresses mismatched, invalid, and outside regions", () => {
    const chromosome = "chrCurrentFiltering";
    const base = {
      chromosome,
      chromosomeLength: 100,
      bands: cytobands(chromosome),
      width: 200,
      height: 20,
    };

    render({ ...base, currentRegion: { chromosome, start: -10, end: 10 } });
    expectBoundaryPoints("left", "3,0 0,0 0,20 3,20");
    expectBoundaryPoints("right", "17,0 20,0 20,20 17,20");

    const suppressedRegions = [
      { chromosome: "chrOther", start: 10, end: 20 },
      { chromosome, start: 20, end: 20 },
      { chromosome, start: 30, end: 20 },
      { chromosome, start: Number.NaN, end: 20 },
      { chromosome, start: -20, end: -10 },
      { chromosome, start: 100, end: 110 },
    ] as GenomicRegion[];
    for (const currentRegion of suppressedRegions) {
      render({ ...base, currentRegion });
      expect(container?.querySelector('[data-testid="current-region-bracket"]')).toBeNull();
      expect(container?.innerHTML).not.toMatch(/NaN|Infinity/);
    }
  });

  it("moves with browser state without replacing application highlights", () => {
    const chromosome = "chrCurrentUpdate";
    const applicationHighlight = highlight("unchanged", 60, 80);
    const useTestBrowserStore = createBrowserStore({
      assembly: { id: "cytoband-test", chromosomes: { [chromosome]: 100 } },
      region: { chromosome, start: 10, end: 20 },
    });

    function BrowserStoreIdeogram() {
      const currentRegion = useTestBrowserStore((state) => state.region);
      return (
        <Cytobands
          bands={cytobands(chromosome)}
          chromosome={chromosome}
          chromosomeLength={100}
          currentRegion={currentRegion}
          height={20}
          highlights={[applicationHighlight]}
          width={200}
        />
      );
    }

    renderNode(<BrowserStoreIdeogram />);
    const highlightElement = getHighlight("unchanged");
    expectBoundaryPoints("left", "23,0 20,0 20,20 23,20");

    act(() => useTestBrowserStore.getState().setRegion({ chromosome, start: 30, end: 40 }));
    expectBoundaryPoints("left", "63,0 60,0 60,20 63,20");
    expect(getHighlight("unchanged")).toBe(highlightElement);
  });
});

function render(props: CytobandsProps) {
  renderNode(<Cytobands {...props} />);
}

function renderNode(node: ReactNode) {
  if (!container) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  act(() => root?.render(node));
}

async function flushMutationObserver() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function cytobands(chromosome: string, stain = "gneg"): readonly Cytoband[] {
  return [band(chromosome, 0, 100, "p1", stain)];
}

function band(
  chromosome: string,
  start: number,
  end: number,
  name: string,
  stain: string,
): Cytoband {
  return { chromosome, start, end, name, stain };
}

function hasFiniteGeometry(element: Element) {
  return ["x", "y", "width", "height", "d"].every((attribute) => {
    const value = element.getAttribute(attribute);
    return value === null || (!value.includes("NaN") && !value.includes("Infinity"));
  });
}

function expectGeometry(selector: string, geometry: Record<string, string>) {
  expectGeometryWithin(container?.querySelector(selector), geometry);
}

function expectGeometryWithin(
  element: Element | null | undefined,
  geometry: Record<string, string>,
) {
  expect(element).not.toBeNull();
  for (const [attribute, value] of Object.entries(geometry)) {
    expect(element?.getAttribute(attribute)).toBe(value);
  }
}

function highlight(
  id: string,
  start: number,
  end: number,
  chromosome?: string,
  color = "#336699",
  opacity?: number,
): Highlight {
  return { id, region: { chromosome, start, end }, color, opacity };
}

function renderedHighlightIds() {
  return [...(container?.querySelectorAll("[data-highlight-id]") ?? [])].map((element) =>
    element.getAttribute("data-highlight-id"),
  );
}

function getHighlight(id: string) {
  const element = container?.querySelector(`[data-highlight-id="${id}"]`);
  if (!(element instanceof SVGElement)) throw new Error(`Highlight ${id} was not rendered`);
  return element;
}

function highlightOpacity(id: string) {
  return getHighlight(id)
    .querySelector('[data-testid="highlight-visual"]')
    ?.getAttribute("fill-opacity");
}

function expectHighlightGeometry(
  id: string,
  shape: "interval" | "marker",
  geometry: Record<string, string>,
) {
  const element = getHighlight(id);
  expect(element.getAttribute("data-highlight-shape")).toBe(shape);
  expectGeometryWithin(element.querySelector('[data-testid="highlight-visual"]'), geometry);
}

function getCurrentRegionBracket() {
  const bracket = container?.querySelector('[data-testid="current-region-bracket"]');
  if (!(bracket instanceof SVGElement)) throw new Error("Current region bracket was not rendered");
  return bracket;
}

function expectBoundaryPoints(side: "left" | "right", points: string) {
  expect(
    getCurrentRegionBracket()
      .querySelector(`[data-testid="current-region-${side}-boundary"]`)
      ?.getAttribute("points"),
  ).toBe(points);
}

function getTooltip() {
  const tooltip = document.body.querySelector('[role="tooltip"]');
  if (!(tooltip instanceof SVGElement)) throw new Error("Tooltip was not rendered");
  return tooltip;
}

function getTooltipPortal() {
  const portal = document.body.querySelector('[data-testid="highlight-tooltip-portal"]');
  if (!(portal instanceof SVGSVGElement)) throw new Error("Tooltip portal was not rendered");
  return portal;
}

function mockGetBBox(implementation: (this: SVGElement) => DOMRect) {
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: vi.fn(implementation),
  });
}

function svgRect({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return new DOMRect(x, y, width, height);
}

function dispatch(element: Element, type: string) {
  act(() => element.dispatchEvent(new Event(type, { bubbles: true })));
}

function dispatchPointer(
  element: Element,
  type: "pointerover" | "pointerout",
  init?: MouseEventInit,
) {
  act(() =>
    element.dispatchEvent(
      new MouseEvent(type, { bubbles: true, clientX: 100, clientY: 100, ...init }),
    ),
  );
}

function dispatchKey(element: Element, key: string, repeat = false) {
  act(() =>
    element.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, repeat }),
    ),
  );
}

function coordinate(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
