// @vitest-environment jsdom

import {
  createBrowserStore,
  defaultScreenGraphQlEndpoint,
  type GenomicRegion,
  type Highlight,
} from "@weng-lab/genomebrowser";
import { act, useEffect, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cytobands, type CytobandColors, type CytobandsProps } from "../src/lib";
import { acquireCytobands } from "../src/cytobands/cytobandData";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const testEndpoint = defaultScreenGraphQlEndpoint;
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

describe("Cytobands requests", () => {
  it("posts without credentials and normalizes its assembly variable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(cytobandPayload("chrFetch")));
    vi.stubGlobal("fetch", fetchMock);

    render({
      assembly: "GRCh38",
      chromosome: "chrFetch",
      width: 500,
      height: 24,
    });
    expect(container?.textContent).toContain("Loading chromosome ideogram");
    expectLiveStatus("Loading chromosome ideogram");
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe(testEndpoint);
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "content-type": "application/json" });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(options.body)) as {
      query: string;
      variables: { assembly: string; chromosome: string };
    };
    expect(body.query).toContain("cytoband(assembly: $assembly, chromosome: $chromosome)");
    expect(body.variables).toEqual({ assembly: "hg38", chromosome: "chrFetch" });
    expect(container?.querySelector('[data-stain="gneg"]')).not.toBeNull();
  });

  it("uses the exact host-owned endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(cytobandPayload("chrProxy")));
    vi.stubGlobal("fetch", fetchMock);

    render({
      assembly: "GRCh38",
      chromosome: "chrProxy",
      endpoint: "https://proxy.example/graphql",
      width: 260,
      height: 19,
    });
    await flush();

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toEqual({ "content-type": "application/json" });
  });

  it("does not require a browser credential", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(cytobandPayload("chrProxyNoKey")));
    vi.stubGlobal("fetch", fetchMock);

    render({
      assembly: "GRCh38",
      chromosome: "chrProxyNoKey",
      endpoint: "https://no-key-proxy.example/graphql",
      width: 260,
      height: 19,
    });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container?.querySelector('[data-stain="gneg"]')).not.toBeNull();
  });

  it.each(["GRCh38", "GRCH38", "hg38"])(
    "normalizes %s to the cytoband resolver assembly",
    async (assembly) => {
      const fetchMock = vi.fn().mockResolvedValue(response(cytobandPayload(`chrAlias${assembly}`)));
      vi.stubGlobal("fetch", fetchMock);

      render({
        assembly,
        chromosome: `chrAlias${assembly}`,
        endpoint: "https://aliases.example/graphql",
        width: 260,
        height: 19,
      });
      await flush();

      expect(requestVariables(fetchMock).assembly).toBe("hg38");
    },
  );

  it("passes unknown assemblies through unchanged", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(cytobandPayload("chrUnknownAssembly")));
    vi.stubGlobal("fetch", fetchMock);

    render({
      assembly: "T2T-CHM13v2.0",
      chromosome: "chrUnknownAssembly",
      endpoint: "https://assemblies.example/graphql",
      width: 260,
      height: 19,
    });
    await flush();

    expect(requestVariables(fetchMock).assembly).toBe("T2T-CHM13v2.0");
  });

  it("keeps original assembly aliases as distinct completed-cache identities", async () => {
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body)) as { variables: { chromosome: string } };
      return response(cytobandPayload(body.variables.chromosome));
    });
    vi.stubGlobal("fetch", fetchMock);
    const base = {
      chromosome: "chrAliasIdentity",
      endpoint: "https://alias-cache.example/graphql",
      width: 260,
      height: 19,
    };

    for (const assembly of ["GRCh38", "GRCH38", "hg38"]) {
      render({ ...base, assembly });
      await flush();
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      fetchMock.mock.calls.map(([, options]) => requestBody(options).variables.assembly),
    ).toEqual(["hg38", "hg38", "hg38"]);

    for (const assembly of ["GRCh38", "GRCH38", "hg38"]) {
      render({ ...base, assembly });
      await flush();
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("refetches only for request identity changes and reuses completed identities", async () => {
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body)) as { variables: { chromosome: string } };
      return response(cytobandPayload(body.variables.chromosome));
    });
    vi.stubGlobal("fetch", fetchMock);
    const base: CytobandsProps = {
      assembly: "GRCh38",
      chromosome: "chrIdentityA",
      endpoint: "https://proxy.example/graphql",
      width: 400,
      height: 20,
    };

    render(base);
    await flush();
    render({ ...base, width: 600, height: 30, colors: { negative: "#abcdef" } });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container?.querySelector('[data-stain="gneg"]')?.getAttribute("fill")).toBe("#abcdef");

    render({ ...base, chromosome: "chrIdentityB" });
    await flush();
    render(base);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    render({ ...base, assembly: "GRCh37" });
    await flush();
    render({ ...base, endpoint: "https://another.example/graphql" });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://proxy.example/graphql",
      "https://proxy.example/graphql",
      "https://proxy.example/graphql",
      "https://another.example/graphql",
    ]);
  });

  it("bounds completed request reuse with deterministic oldest-first eviction", async () => {
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body)) as { variables: { chromosome: string } };
      return response(cytobandPayload(body.variables.chromosome));
    });
    vi.stubGlobal("fetch", fetchMock);
    const props = (chromosome: string): CytobandsProps => ({
      assembly: "GRCh38",
      chromosome,
      endpoint: "https://cache.example/graphql",
      width: 200,
      height: 20,
    });

    for (let index = 0; index < 33; index += 1) {
      render(props(`chrCache${index}`));
      await flush();
    }
    expect(fetchMock).toHaveBeenCalledTimes(33);

    render(props("chrCache32"));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(33);

    render(props("chrCache0"));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(34);
  });

  it("does not evict an active pending request while bounding completed entries", async () => {
    const pendingResponse = deferred<Response>();
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body)) as { variables: { chromosome: string } };
      if (body.variables.chromosome === "chrActivePending") return pendingResponse.promise;
      return response(cytobandPayload(body.variables.chromosome));
    });
    vi.stubGlobal("fetch", fetchMock);
    const endpoint = "https://pending-cache.example/graphql";
    const activeRequest = acquireCytobands({
      endpoint,
      assembly: "GRCh38",
      chromosome: "chrActivePending",
    });

    for (let index = 0; index < 33; index += 1) {
      await acquireCytobands({
        endpoint,
        assembly: "GRCh38",
        chromosome: `chrCompleted${index}`,
      }).promise;
    }

    const sharedRequest = acquireCytobands({
      endpoint,
      assembly: "GRCh38",
      chromosome: "chrActivePending",
    });
    expect(sharedRequest.promise).toBe(activeRequest.promise);
    expect(fetchMock).toHaveBeenCalledTimes(34);
    sharedRequest.release();
    activeRequest.release();
  });

  it.each([
    [
      "endpoint",
      {
        assembly: "GRCh38",
        chromosome: "chrRapidEndpoint",
        endpoint: "https://old-endpoint.example/graphql",
      },
      {
        assembly: "GRCh38",
        chromosome: "chrRapidEndpoint",
        endpoint: "https://new-endpoint.example/graphql",
      },
    ],
    [
      "assembly",
      {
        assembly: "GRCh37",
        chromosome: "chrRapidAssembly",
        endpoint: "https://rapid-assembly.example/graphql",
      },
      {
        assembly: "GRCh38",
        chromosome: "chrRapidAssembly",
        endpoint: "https://rapid-assembly.example/graphql",
      },
    ],
    [
      "chromosome",
      {
        assembly: "GRCh38",
        chromosome: "chrRapidOld",
        endpoint: "https://rapid-chromosome.example/graphql",
      },
      {
        assembly: "GRCh38",
        chromosome: "chrRapidNew",
        endpoint: "https://rapid-chromosome.example/graphql",
      },
    ],
  ] as const)(
    "cancels obsolete work and rejects a stale result after a rapid %s change",
    async (_, oldIdentity, newIdentity) => {
      const oldRequest = deferred<Response>();
      const newRequest = deferred<Response>();
      const signals: AbortSignal[] = [];
      const fetchMock = vi.fn((_url: string, options: RequestInit) => {
        signals.push(options.signal as AbortSignal);
        return signals.length === 1 ? oldRequest.promise : newRequest.promise;
      });
      vi.stubGlobal("fetch", fetchMock);

      render({ ...oldIdentity, width: 300, height: 20 });
      await flush();
      render({ ...newIdentity, width: 300, height: 20 });
      await flush();
      expect(signals[0]?.aborted).toBe(true);

      newRequest.resolve(response(cytobandPayload(newIdentity.chromosome, "gpos50")));
      await flush();
      oldRequest.resolve(response(cytobandPayload(oldIdentity.chromosome, "stalk")));
      await flush();
      expect(container?.querySelector('[data-stain="gpos50"]')).not.toBeNull();
      expect(container?.querySelector('[data-stain="stalk"]')).toBeNull();
    },
  );
});

describe("Cytobands response handling", () => {
  it("shows a bounded accessible error when native fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));
    render({ assembly: "GRCh38", chromosome: "chrNetworkError", width: 230, height: 17 });
    expectLiveStatus("Loading chromosome ideogram");
    await flush();

    const svg = container?.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 230 17");
    expectLiveStatus("Network unavailable");
    expect(container?.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it.each([
    ["authentication errors", response({}, 401), "failed with 401"],
    ["transport errors", response({}, 503), "failed with 503"],
    ["GraphQL errors", response({ errors: [{ message: "not authorized" }] }), "not authorized"],
    ["malformed envelopes", response({ data: { cytoband: null } }), "response was malformed"],
    [
      "malformed bands",
      response({ data: { cytoband: [{ stain: "gneg", coordinates: { start: 10, end: 10 } }] } }),
      "no valid bands",
    ],
  ])("shows bounded errors for %s", async (_name, fetchResponse, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fetchResponse));
    render({ assembly: "GRCh38", chromosome: `chrError${message}`, width: 240, height: 18 });
    await flush();

    const svg = container?.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("240");
    expect(svg?.getAttribute("height")).toBe("18");
    expect(container?.textContent).toContain(message);
    expect(container?.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("shows a bounded empty state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ data: { cytoband: [] } })));
    render({ assembly: "GRCh38", chromosome: "chrEmpty", width: 220, height: 16 });
    expectLiveStatus("Loading chromosome ideogram");
    await flush();

    expect(container?.textContent).toContain("No cytoband data");
    expectLiveStatus("No cytoband data");
    expect(container?.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 220 16");
    expect(container?.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("normalizes valid bands, ignores invalid coordinates, and renders every stain safely", async () => {
    const chromosome = "chrGeometry";
    const coordinate: GenomicRegion = { chromosome, start: 100, end: 200 };
    const bands = [
      { stain: "mystery", coordinates: { chromosome, start: 600, end: 700 } },
      { stain: "acen", coordinates: { chromosome, start: 400, end: 500 } },
      { stain: "gpos75", coordinates: { chromosome, start: 200, end: 300 } },
      { stain: "gneg", coordinates: coordinate },
      { stain: "gvar", coordinates: { chromosome, start: 300, end: 350 } },
      { stain: "stalk", coordinates: { chromosome, start: 350, end: 400 } },
      { stain: "acen", coordinates: { chromosome, start: 500, end: 600 } },
      { stain: "invalid", coordinates: { chromosome, start: -10, end: 50 } },
      { stain: "invalid", coordinates: { chromosome, start: 800, end: 700 } },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ data: { cytoband: bands } })));

    render({ assembly: "GRCh38", chromosome, width: 600, height: 30 });
    await flush();

    const renderedBands = [...(container?.querySelectorAll("[data-stain]") ?? [])];
    expect(renderedBands.map((band) => band.getAttribute("data-stain"))).toEqual([
      "gneg",
      "gpos75",
      "gvar",
      "stalk",
      "acen",
      "acen",
      "mystery",
    ]);
    expect(renderedBands.every(hasFiniteGeometry)).toBe(true);
    expectGeometry('[data-stain="gneg"]', { x: "0", width: "100", y: "3", height: "24" });
    expectGeometry('[data-stain="gvar"]', { x: "200", width: "50", y: "3", height: "24" });
    const centromeres = container?.querySelectorAll('[data-stain="acen"]');
    expect(centromeres?.[0]?.getAttribute("d")).toBe("M 300 3 L 400 15 L 300 27 Z");
    expect(centromeres?.[1]?.getAttribute("d")).toBe("M 500 3 L 400 15 L 500 27 Z");
    expect(container?.querySelector('[data-stain="gpos75"]')?.getAttribute("fill-opacity")).toBe(
      "0.75",
    );
    expect(container?.querySelector('[data-stain="mystery"]')?.getAttribute("fill")).toBe(
      "#b8b8b8",
    );
    expect(
      container?.querySelector('[data-testid="cytobands"]')?.getAttribute("clip-path"),
    ).toMatch(/^url\(#chromosome-ideogram-/);
    expect(container?.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("applies a public color override without another request", async () => {
    const chromosome = "chrColors";
    const fetchMock = vi.fn().mockResolvedValue(response(cytobandPayload(chromosome, "stalk")));
    vi.stubGlobal("fetch", fetchMock);
    const colors: Partial<CytobandColors> = { stalk: "#123456" };

    render({ assembly: "GRCh38", chromosome, width: 200, height: 20 });
    await flush();
    render({ assembly: "GRCh38", chromosome, width: 200, height: 20, colors });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container?.querySelector('[data-stain="stalk"]')?.getAttribute("fill")).toBe("#123456");
  });

  it("renders bands and highlights without an enclosing outline", async () => {
    const chromosome = "chrNoOutline";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));

    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [highlight("visible", 10, 30)],
    });
    await flush();

    expect(container?.querySelector('[data-stain="gneg"]')).not.toBeNull();
    expect(
      getHighlight("visible").querySelector('[data-testid="highlight-visual"]'),
    ).not.toBeNull();
    expect(container?.querySelector('svg > rect[fill="none"]')).toBeNull();
  });
});

describe("Cytobands highlights", () => {
  it("defaults missing highlight opacity to 0.2 and preserves explicit opacity values", async () => {
    const chromosome = "chrHighlightOpacity";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    const highlights = [
      highlight("default", 10, 20),
      highlight("zero", 30, 40, chromosome, "#336699", 0),
      highlight("fraction", 50, 60, chromosome, "#336699", 0.45),
      highlight("one", 70, 80, chromosome, "#336699", 1),
    ] satisfies readonly Highlight[];

    render({ assembly: "GRCh38", chromosome, width: 200, height: 20, highlights });
    await flush();

    expect(highlightOpacity("default")).toBe("0.2");
    expect(highlightOpacity("zero")).toBe("0");
    expect(highlightOpacity("fraction")).toBe("0.45");
    expect(highlightOpacity("one")).toBe("1");
  });

  it("uses v2 highlights, filters chromosomes, validates intervals, and clips geometry", async () => {
    const chromosome = "chrHighlightGeometry";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
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

    render({ assembly: "GRCh38", chromosome, width: 200, height: 20, highlights });
    await flush();

    expect(renderedHighlightIds()).toEqual([
      "clipped-left",
      "inherited",
      "matching",
      "clipped-right",
    ]);
    expectHighlightGeometry("clipped-left", "interval", {
      x: "0",
      y: "0",
      width: "20",
      height: "20",
    });
    expectHighlightGeometry("clipped-right", "interval", { x: "180", width: "20" });
    expectHighlightGeometry("inherited", "interval", { x: "20", width: "40" });
    expectHighlightGeometry("matching", "marker", {
      x: "100",
      y: "0",
      width: "2",
      height: "20",
    });
    const marker = getHighlight("matching");
    expectGeometryWithin(marker, '[data-testid="highlight-hit-target"]', {
      x: "95",
      y: "0",
      width: "12",
      height: "20",
    });
    expect(marker.querySelector('[data-testid="highlight-visual"]')?.getAttribute("fill")).toBe(
      "#222222",
    );
    expect(
      marker.querySelector('[data-testid="highlight-visual"]')?.getAttribute("fill-opacity"),
    ).toBe("0.4");
    expect(container?.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("orders overlaps deterministically and preserves stable ID identity", async () => {
    const chromosome = "chrHighlightOrder";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    const alpha = highlight("alpha", 20, 50, chromosome);
    const beta = highlight("beta", 20, 50, chromosome);

    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [beta, alpha],
    });
    await flush();
    const alphaElement = getHighlight("alpha");
    expect(renderedHighlightIds()).toEqual(["alpha", "beta"]);

    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [alpha, beta],
    });
    expect(renderedHighlightIds()).toEqual(["alpha", "beta"]);
    expect(getHighlight("alpha")).toBe(alphaElement);
  });

  it.each([
    ["interval", highlight("interactive-wide", 10, 30)],
    ["marker", highlight("interactive-narrow", 50, 51)],
  ] as const)(
    "gives the %s shape equivalent pointer and accessible activation behavior",
    async (_, item) => {
      const chromosome = `chrInteraction${item.id}`;
      const onPointerEnter = vi.fn();
      const onPointerLeave = vi.fn();
      const onClick = vi.fn();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
      render({
        assembly: "GRCh38",
        chromosome,
        width: 200,
        height: 20,
        highlights: [item],
        onHighlightClick: onClick,
        onHighlightPointerEnter: onPointerEnter,
        onHighlightPointerLeave: onPointerLeave,
      });
      await flush();
      const element = getHighlight(item.id);

      expect(element.getAttribute("role")).toBe("button");
      expect(element.getAttribute("tabindex")).toBe("0");
      expect(element.closest('[role="group"]')).toBe(container?.querySelector("svg"));
      dispatch(element, "pointerover");
      expect(onPointerEnter).toHaveBeenCalledTimes(1);
      expect(onPointerEnter.mock.calls[0]?.[0]).toBe(item);
      expect(onPointerEnter.mock.calls[0]?.[1].type).toBe("pointerenter");
      expect(container?.querySelector('[role="tooltip"]')?.textContent).toBe(
        `${chromosome}: ${coordinate(item.region.start)}–${coordinate(item.region.end)}`,
      );
      const tooltip = container?.querySelector('[role="tooltip"]');
      expect(tooltip?.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(tooltip?.getAttribute("transform")).toBe("translate(0 20)");
      expect(tooltip?.querySelector("rect")?.getAttribute("fill")).toBe("#f5f5f5");
      expect(tooltip?.querySelector("rect")?.getAttribute("stroke")).toBe("#777777");
      expect(tooltip?.querySelector("rect")?.getAttribute("width")).toBe("200");
      expect(container?.querySelector("foreignObject")).toBeNull();
      const svg = container?.querySelector<SVGSVGElement>("svg");
      expect(svg?.style.overflow).toBe("visible");
      expect(svg?.style.position).toBe("");
      expect(svg?.style.zIndex).toBe("");
      dispatch(element, "pointerout");
      expect(onPointerLeave).toHaveBeenCalledTimes(1);
      expect(onPointerLeave.mock.calls[0]?.[0]).toBe(item);
      expect(onPointerLeave.mock.calls[0]?.[1].type).toBe("pointerleave");
      expect(container?.querySelector('[role="tooltip"]')).toBeNull();

      dispatch(element, "focusin");
      expect(container?.querySelector('[role="tooltip"]')).toBeNull();
      dispatch(element, "pointerover");
      expect(container?.querySelector('[role="tooltip"]')).not.toBeNull();
      dispatch(element, "focusin");
      expect(container?.querySelector('[role="tooltip"]')).toBeNull();
      dispatch(element, "pointerover");
      expect(container?.querySelector('[role="tooltip"]')).not.toBeNull();
      dispatchKey(element, "Enter");
      expect(container?.querySelector('[role="tooltip"]')).toBeNull();
      dispatchKey(element, " ");
      dispatchKey(element, "Escape");
      dispatchKey(element, "Enter", true);
      expect(container?.querySelector('[role="tooltip"]')).toBeNull();
      dispatch(element, "pointerover");
      expect(container?.querySelector('[role="tooltip"]')).not.toBeNull();
      dispatch(element, "click");
      expect(container?.querySelector('[role="tooltip"]')).toBeNull();
      expect(onClick).toHaveBeenCalledTimes(3);
      expect(onClick.mock.calls.map(([value]) => value)).toEqual([item, item, item]);
      expect(onClick.mock.calls.map(([, event]) => event.type)).toEqual([
        "keydown",
        "keydown",
        "click",
      ]);
      dispatch(element, "focusout");
      expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    },
  );

  it("keeps pointer-only tooltip ownership correct across focus and rapid switching", async () => {
    const chromosome = "chrTooltipLifecycle";
    const first = highlight("first", 10, 20);
    const second = highlight("second", 60, 70);
    const renderTooltip = vi.fn((item: Highlight) => (
      <text>{`custom-${item.id}-${item.color}`}</text>
    ));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    const props: CytobandsProps = {
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [first, second],
      renderHighlightTooltip: renderTooltip,
      onHighlightClick: vi.fn(),
    };
    render(props);
    await flush();
    expect(renderTooltip).not.toHaveBeenCalled();

    const firstElement = getHighlight("first");
    const secondElement = getHighlight("second");
    dispatch(firstElement, "focusin");
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    expect(renderTooltip).not.toHaveBeenCalled();
    dispatch(firstElement, "pointerover");
    const customTooltip = container?.querySelector('[role="tooltip"]');
    expect(customTooltip?.textContent).toBe("custom-first-#336699");
    expect(customTooltip?.querySelector("text")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(customTooltip?.closest("svg")).toBe(container?.querySelector("svg"));
    expect(container?.querySelector("foreignObject")).toBeNull();
    dispatch(secondElement, "pointerover");
    expect(container?.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
    expect(container?.querySelector('[role="tooltip"]')?.textContent).toBe("custom-second-#336699");
    dispatch(firstElement, "pointerout");
    expect(container?.querySelector('[role="tooltip"]')?.textContent).toBe("custom-second-#336699");
    dispatch(secondElement, "pointerout");
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();

    const changedFirst = { ...first, color: "#abcdef" } satisfies Highlight;
    render({ ...props, highlights: [changedFirst, second] });
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    dispatch(getHighlight("first"), "pointerover");
    expect(container?.querySelector('[role="tooltip"]')?.textContent).toBe("custom-first-#abcdef");
    dispatch(getHighlight("first"), "click");
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    expect(renderTooltip.mock.calls.every((call) => call.length === 1)).toBe(true);
  });

  it("closes one highlight's tooltip when another highlight receives focus", async () => {
    const chromosome = "chrCrossHighlightFocus";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [highlight("hovered", 10, 20), highlight("focused", 60, 70)],
      onHighlightClick: vi.fn(),
    });
    await flush();

    dispatch(getHighlight("hovered"), "pointerover");
    expect(container?.querySelector('[role="tooltip"]')).not.toBeNull();
    dispatch(getHighlight("focused"), "focusin");
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();

    dispatch(getHighlight("hovered"), "pointerover");
    expect(container?.querySelector('[role="tooltip"]')).not.toBeNull();
  });

  it("keeps asynchronous application tooltip data active-only across rapid switching", async () => {
    const chromosome = "chrAsyncTooltipLifecycle";
    const firstRequest = deferred<string>();
    const secondRequest = deferred<string>();
    const lookup = vi.fn((id: string) =>
      id === "first-async" ? firstRequest.promise : secondRequest.promise,
    );
    const unmounted = vi.fn();

    function AsyncTooltip({ item }: { item: Highlight }) {
      const [content, setContent] = useState(`loading-${item.id}`);
      useEffect(() => {
        let active = true;
        void lookup(item.id).then((value) => {
          if (active) setContent(value);
        });
        return () => {
          active = false;
          unmounted(item.id);
        };
      }, [item]);
      return <text>{content}</text>;
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [highlight("first-async", 10, 20), highlight("second-async", 60, 70)],
      renderHighlightTooltip: (item) => <AsyncTooltip item={item} />,
    });
    await flush();
    expect(lookup).not.toHaveBeenCalled();

    dispatch(getHighlight("first-async"), "pointerover");
    expect(getTooltip().textContent).toBe("loading-first-async");
    expect(lookup).toHaveBeenCalledWith("first-async");

    dispatch(getHighlight("second-async"), "pointerover");
    expect(unmounted).toHaveBeenCalledWith("first-async");
    expect(getTooltip().textContent).toBe("loading-second-async");
    expect(lookup.mock.calls.map(([id]) => id)).toEqual(["first-async", "second-async"]);

    firstRequest.resolve("stale-first-content");
    await flush();
    expect(getTooltip().textContent).toBe("loading-second-async");
    secondRequest.resolve("current-second-content");
    await flush();
    expect(getTooltip().textContent).toBe("current-second-content");

    dispatch(getHighlight("second-async"), "pointerout");
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    expect(unmounted).toHaveBeenCalledWith("second-async");
  });

  it("sizes measured SVG tooltip content with padding and clamps it to Cytobands", async () => {
    const chromosome = "chrMeasuredTooltip";
    mockGetBBox(function () {
      return this.textContent === "tiny"
        ? svgRect({ x: 2, y: -3, width: 20, height: 10 })
        : svgRect({ x: 0, y: -10, width: 350, height: 18 });
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    const item = highlight("measured", 10, 20);
    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [item],
      renderHighlightTooltip: () => <text>tiny</text>,
    });
    await flush();

    dispatch(getHighlight("measured"), "pointerover");
    let tooltip = getTooltip();
    expectGeometryWithin(tooltip, "rect", { width: "32", height: "22" });
    expect(tooltip.getAttribute("transform")).toBe("translate(14 20)");
    expect(tooltip.querySelector("g")?.getAttribute("transform")).toBe("translate(4 9)");

    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [item],
    });
    tooltip = getTooltip();
    expectGeometryWithin(tooltip, "rect", { width: "200", height: "30" });
    expect(tooltip.getAttribute("transform")).toBe("translate(0 20)");
  });

  it("uses deterministic text measurement when getBBox is unavailable", async () => {
    delete (SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox;
    const chromosome = "chrTooltipFallback";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [highlight("fallback", 40, 60)],
      renderHighlightTooltip: () => <text>four</text>,
    });
    await flush();

    dispatch(getHighlight("fallback"), "pointerover");
    const tooltip = getTooltip();
    expectGeometryWithin(tooltip, "rect", { width: "40", height: "26" });
    expect(tooltip.getAttribute("transform")).toBe("translate(80 20)");
  });

  it("remeasures custom SVG content changes without mounting inactive tooltips", async () => {
    const chromosome = "chrChangingTooltip";
    let setTooltipText: ((value: string) => void) | undefined;
    function ChangingTooltip() {
      const [text, setText] = useState("short");
      setTooltipText = setText;
      return <text>{text}</text>;
    }
    const getBBox = mockGetBBox(function () {
      return svgRect({
        x: 0,
        y: -10,
        width: this.textContent === "short" ? 30 : 90,
        height: 12,
      });
    });
    const renderTooltip = vi.fn((_item: Highlight) => <ChangingTooltip />);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [highlight("changing", 40, 60), highlight("inactive", 70, 80)],
      renderHighlightTooltip: renderTooltip,
    });
    await flush();
    expect(renderTooltip).not.toHaveBeenCalled();

    dispatch(getHighlight("changing"), "pointerover");
    expect(renderTooltip).toHaveBeenCalled();
    expect(renderTooltip.mock.calls.every(([item]) => item.id === "changing")).toBe(true);
    expectGeometryWithin(getTooltip(), "rect", { width: "42", height: "24" });
    act(() => setTooltipText?.("substantially longer"));
    await flushMutationObserver();
    expectGeometryWithin(getTooltip(), "rect", { width: "102", height: "24" });
    expect(getBBox).toHaveBeenCalled();
    dispatch(getHighlight("changing"), "pointerout");
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("clears active tooltip state when highlights or chromosome change", async () => {
    const firstChromosome = "chrActivePropsA";
    const secondChromosome = "chrActivePropsB";
    const item = highlight("active", 10, 20);
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const chromosome = requestBody(options).variables.chromosome;
      return response(cytobandPayload(chromosome));
    });
    vi.stubGlobal("fetch", fetchMock);
    const base = {
      assembly: "GRCh38",
      chromosome: firstChromosome,
      width: 200,
      height: 20,
      onHighlightClick: vi.fn(),
    };
    render({ ...base, highlights: [item] });
    await flush();
    dispatch(getHighlight("active"), "pointerover");
    expect(container?.querySelector('[role="tooltip"]')).not.toBeNull();

    render({ ...base, highlights: [] });
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    render({ ...base, highlights: [item] });
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    dispatch(getHighlight("active"), "pointerover");
    expect(container?.querySelector('[role="tooltip"]')).not.toBeNull();

    render({ ...base, highlights: [highlight("active", 110, 120)] });
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    render({ ...base, highlights: [item] });
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    dispatch(getHighlight("active"), "pointerover");
    expect(container?.querySelector('[role="tooltip"]')).not.toBeNull();

    render({ ...base, chromosome: secondChromosome, highlights: [item] });
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
    await flush();
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("does not refetch when highlights, interaction callbacks, or tooltip content change", async () => {
    const chromosome = "chrHighlightRequestIdentity";
    const fetchMock = vi.fn().mockResolvedValue(response(cytobandPayload(chromosome)));
    vi.stubGlobal("fetch", fetchMock);
    const base = { assembly: "GRCh38", chromosome, width: 200, height: 20 };
    render({ ...base, highlights: [highlight("one", 10, 20)] });
    await flush();
    render({
      ...base,
      highlights: [highlight("two", 30, 40)],
      onHighlightClick: vi.fn(),
      onHighlightPointerEnter: vi.fn(),
      onHighlightPointerLeave: vi.fn(),
      renderHighlightTooltip: (item) => <text>{`tooltip-${item.id}`}</text>,
    });
    dispatch(getHighlight("two"), "pointerover");
    expect(container?.querySelector('[role="tooltip"]')?.textContent).toBe("tooltip-two");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not make non-clickable highlights focusable", async () => {
    const chromosome = "chrNonClickable";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      highlights: [highlight("passive", 10, 20)],
    });
    await flush();
    const element = getHighlight("passive");
    expect(element.hasAttribute("tabindex")).toBe(false);
    expect(element.hasAttribute("role")).toBe(false);
    expect(container?.querySelector("svg")?.getAttribute("role")).toBe("img");
  });
});

describe("Cytobands current region", () => {
  it("renders wide and minimum-width bracket geometry at the current genomic position", async () => {
    const chromosome = "chrCurrentGeometry";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    const base = { assembly: "GRCh38", chromosome, width: 200, height: 20 };

    render({
      ...base,
      currentRegion: { chromosome, start: 10, end: 30 },
    });
    await flush();

    let bracket = getCurrentRegionBracket();
    expect(bracket.getAttribute("pointer-events")).toBe("none");
    expect(bracket.getAttribute("role")).toBe("img");
    expect(bracket.getAttribute("aria-label")).toBe(`Current region ${chromosome}: 10–30`);
    expect(bracket.getAttribute("clip-path")).toBeNull();
    expect(bracket.closest("svg")?.getAttribute("role")).toBe("group");
    expectBoundaryPoints("left", "23,0 20,0 20,20 23,20");
    expectBoundaryPoints("right", "57,0 60,0 60,20 57,20");
    expect(bracket.querySelectorAll('[fill="none"][stroke="#1976d2"]')).toHaveLength(2);

    render({
      ...base,
      currentRegion: { chromosome, start: 50, end: 51 },
    });
    bracket = getCurrentRegionBracket();
    expectBoundaryPoints("left", "100,0 97,0 97,20 100,20");
    expectBoundaryPoints("right", "102,0 105,0 105,20 102,20");
    expect(container?.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("clips partial regions and suppresses mismatched, invalid, and outside regions", async () => {
    const chromosome = "chrCurrentFiltering";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    const base = { assembly: "GRCh38", chromosome, width: 200, height: 20 };

    render({ ...base, currentRegion: { chromosome, start: -10, end: 10 } });
    await flush();
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

  it("does not participate in highlight tooltip or callback behavior", async () => {
    const chromosome = "chrCurrentInteraction";
    const onPointerEnter = vi.fn();
    const onPointerLeave = vi.fn();
    const onClick = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(cytobandPayload(chromosome))));
    render({
      assembly: "GRCh38",
      chromosome,
      width: 200,
      height: 20,
      currentRegion: { chromosome, start: 10, end: 20 },
      highlights: [highlight("application", 40, 60)],
      onHighlightClick: onClick,
      onHighlightPointerEnter: onPointerEnter,
      onHighlightPointerLeave: onPointerLeave,
    });
    await flush();

    const bracket = getCurrentRegionBracket();
    expect(bracket.previousElementSibling?.getAttribute("data-testid")).toBe("highlights");
    dispatch(bracket, "pointerover");
    dispatch(bracket, "pointerout");
    dispatch(bracket, "click");
    expect(onPointerEnter).not.toHaveBeenCalled();
    expect(onPointerLeave).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    expect(container?.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("moves independently without refetching or changing application highlights", async () => {
    const chromosome = "chrCurrentUpdate";
    const fetchMock = vi.fn().mockResolvedValue(response(cytobandPayload(chromosome)));
    const applicationHighlight = highlight("unchanged", 60, 80);
    const useTestBrowserStore = createBrowserStore({
      assembly: { id: "cytoband-test", chromosomes: { [chromosome]: 100 } },
      region: { chromosome, start: 10, end: 20 },
    });
    vi.stubGlobal("fetch", fetchMock);

    function BrowserStoreIdeogram() {
      const currentRegion = useTestBrowserStore((state) => state.region);
      return (
        <Cytobands
          assembly="GRCh38"
          chromosome={chromosome}
          endpoint={testEndpoint}
          currentRegion={currentRegion}
          height={20}
          highlights={[applicationHighlight]}
          width={200}
        />
      );
    }

    renderNode(<BrowserStoreIdeogram />);
    await flush();
    const highlightElement = getHighlight("unchanged");
    expectBoundaryPoints("left", "23,0 20,0 20,20 23,20");

    act(() => useTestBrowserStore.getState().setRegion({ chromosome, start: 30, end: 40 }));
    expectBoundaryPoints("left", "63,0 60,0 60,20 63,20");
    expect(getHighlight("unchanged")).toBe(highlightElement);
    expect(renderedHighlightIds()).toEqual(["unchanged"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function render(props: Omit<CytobandsProps, "endpoint"> & { endpoint?: string }) {
  renderNode(<Cytobands endpoint={testEndpoint} {...props} />);
}

function renderNode(node: ReactNode) {
  if (!container) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  act(() => root?.render(node));
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function flushMutationObserver() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function response(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function requestVariables(fetchMock: ReturnType<typeof vi.fn>) {
  const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
  return requestBody(options).variables;
}

function requestBody(options: RequestInit) {
  return JSON.parse(String(options.body)) as {
    variables: { assembly: string; chromosome: string };
  };
}

function cytobandPayload(chromosome: string, stain = "gneg") {
  return {
    data: {
      cytoband: [{ stain, coordinates: { chromosome, start: 0, end: 100 } }],
    },
  };
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function hasFiniteGeometry(element: Element) {
  return ["x", "y", "width", "height", "d"].every((attribute) => {
    const value = element.getAttribute(attribute);
    return value === null || (!value.includes("NaN") && !value.includes("Infinity"));
  });
}

function expectGeometry(selector: string, geometry: Record<string, string>) {
  const element = container?.querySelector(selector);
  expect(element).not.toBeNull();
  for (const [attribute, value] of Object.entries(geometry)) {
    expect(element?.getAttribute(attribute)).toBe(value);
  }
}

function expectLiveStatus(message: string) {
  const status = container?.querySelector('[role="status"]');
  expect(status?.getAttribute("aria-live")).toBe("polite");
  expect(status?.textContent).toContain(message);
  expect(status?.closest('[role="img"]')).toBeNull();
  expect(container?.querySelector('[role="img"] [role="status"]')).toBeNull();
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
  const tooltip = container?.querySelector('[role="tooltip"]');
  if (!(tooltip instanceof SVGElement)) throw new Error("Tooltip was not rendered");
  return tooltip;
}

function mockGetBBox(implementation: (this: SVGElement) => DOMRect) {
  const getBBox = vi.fn(implementation);
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: getBBox,
  });
  return getBBox;
}

function svgRect({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return new DOMRect(x, y, width, height);
}

function expectHighlightGeometry(
  id: string,
  shape: "interval" | "marker",
  geometry: Record<string, string>,
) {
  const element = getHighlight(id);
  expect(element.getAttribute("data-highlight-shape")).toBe(shape);
  expectGeometryWithin(element, '[data-testid="highlight-visual"]', geometry);
}

function expectGeometryWithin(parent: Element, selector: string, geometry: Record<string, string>) {
  const element = parent.querySelector(selector);
  expect(element).not.toBeNull();
  for (const [attribute, value] of Object.entries(geometry)) {
    expect(element?.getAttribute(attribute)).toBe(value);
  }
}

function dispatch(element: Element, type: string) {
  act(() => element.dispatchEvent(new Event(type, { bubbles: true })));
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
