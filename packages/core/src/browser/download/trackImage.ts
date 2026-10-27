const SVG_NS = "http://www.w3.org/2000/svg";

// Preserve presentation inherited from the embedding page in a standalone image.
const presentationProperties = [
  "color",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "alignment-baseline",
  "opacity",
  "visibility",
  "display",
  "paint-order",
  "shape-rendering",
  "text-decoration",
  "clip-path",
  "mask",
  "filter",
  "stop-color",
  "stop-opacity",
  "flood-color",
  "flood-opacity",
  "vector-effect",
  "marker-start",
  "marker-mid",
  "marker-end",
  "transform",
  "transform-origin",
  "transform-box",
  "x",
  "y",
  "width",
  "height",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
];

// Inherited values only need writing where they differ from the copied parent.
const inheritedProperties = new Set([
  "color",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "visibility",
  "paint-order",
  "shape-rendering",
  "marker-start",
  "marker-mid",
  "marker-end",
]);

// Elements whose own defaults are measured once per export.
const defaultTags = [
  "g",
  "rect",
  "path",
  "line",
  "circle",
  "ellipse",
  "polygon",
  "polyline",
  "text",
  "tspan",
  "image",
  "use",
  "defs",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "linearGradient",
  "radialGradient",
  "stop",
  "filter",
];

// Painted elements that can be dropped when they lie outside the exported width.
const cullableTags = new Set([
  "rect",
  "path",
  "line",
  "circle",
  "ellipse",
  "polygon",
  "polyline",
  "text",
  "image",
  "use",
]);

// Content of these elements is referenced, not painted where it sits.
const referencedContainers = new Set([
  "defs",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "symbol",
  "linearGradient",
  "radialGradient",
  "filter",
]);

// Client-pixel slack so strokes and antialiasing at the edges survive culling.
const CULL_TOLERANCE = 8;

/**
 * Copy elements with the computed presentation a standalone image needs. Values that the
 * copy reproduces through its attributes, its copied parent, or element defaults are not
 * repeated, and painted elements outside `visible` (in browser units) are dropped.
 */
function createCopier(
  browser: SVGSVGElement,
  visible: { x: number; width: number },
  includeTitles: boolean,
) {
  const document = browser.ownerDocument;
  const defaults = measureDefaults(document);
  const probe = document.createElementNS(SVG_NS, "g");
  const normalized = new Map<string, string>();
  const bounds = getClientBounds(browser, visible);

  // Serialize an attribute value the way computed style reports it, or "" if CSS rejects it.
  const normalize = (property: string, value: string) => {
    const key = `${property}|${value}`;
    let result = normalized.get(key);
    if (result === undefined) {
      const candidates = [value];
      if (/^\s*-?(\d+\.?\d*|\.\d+)(e-?\d+)?\s*$/i.test(value)) candidates.push(`${value.trim()}px`);
      if (property === "d") candidates.push(`path("${value}")`);
      result = "";
      for (const candidate of candidates) {
        probe.style.setProperty(property, candidate);
        result = probe.style.getPropertyValue(property);
        probe.style.removeProperty(property);
        if (result) break;
      }
      normalized.set(key, result);
    }
    return result;
  };

  const copy = (
    source: Element,
    parent: Map<string, string> | null,
    referenced: boolean,
  ): Element | null => {
    const tag = source.localName;
    if (bounds && !referenced && cullableTags.has(tag)) {
      const box = source.getBoundingClientRect();
      if (box.right < bounds.left || box.left > bounds.right) return null;
    }
    const element = source.cloneNode(false) as SVGElement;
    const computed = getComputedStyle(source);
    const ownDefaults = defaults.get(tag);
    const inherited = new Map<string, string>();
    for (const property of presentationProperties) {
      const raw = computed.getPropertyValue(property);
      if (!raw) continue;
      // Browsers can resolve local SVG references against the page URL.
      const value = raw.replace(/url\(["']?[^)"']*#([^)"']+)["']?\)/g, "url(#$1)");
      const isInherited = inheritedProperties.has(property);
      if (isInherited) inherited.set(property, value);
      const inline = element.style.getPropertyValue(property);
      const attribute = inline ? null : source.getAttribute(property);
      if (inline || attribute !== null) {
        // The copy keeps this declaration; override it only when the page changed the result.
        const specified = inline || normalize(property, attribute!);
        if (specified !== value) element.style.setProperty(property, value);
        continue;
      }
      const reproduced = isInherited
        ? parent?.get(property) === value
        : ownDefaults?.get(property) === value;
      if (!reproduced) element.style.setProperty(property, value);
    }
    const childReferenced = referenced || referencedContainers.has(tag);
    for (const child of source.childNodes) {
      if (child instanceof Element) {
        if (
          child.hasAttribute("data-track-export-exclude") ||
          (!includeTitles && child.hasAttribute("data-export-title"))
        ) {
          continue;
        }
        const childCopy = copy(child, inherited, childReferenced);
        if (childCopy) element.append(childCopy);
      } else {
        element.append(child.cloneNode(true));
      }
    }
    return element;
  };

  // Top-level copies have no copied parent, so they carry every inherited value.
  return (source: Element) => copy(source, null, false);
}

// Measure each element's non-inherited defaults in one detached-from-layout batch.
function measureDefaults(document: Document) {
  const host = document.createElementNS(SVG_NS, "svg");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  const elements = defaultTags.map((tag) => {
    const element = document.createElementNS(SVG_NS, tag);
    host.append(element);
    return [tag, element] as const;
  });
  (document.body ?? document.documentElement).append(host);
  const defaults = new Map<string, Map<string, string>>();
  try {
    for (const [tag, element] of elements) {
      const computed = getComputedStyle(element);
      const values = new Map<string, string>();
      for (const property of presentationProperties) {
        if (!inheritedProperties.has(property)) {
          values.set(property, computed.getPropertyValue(property));
        }
      }
      defaults.set(tag, values);
    }
  } finally {
    host.remove();
  }
  return defaults;
}

function getClientBounds(browser: SVGSVGElement, visible: { x: number; width: number }) {
  const viewBoxWidth = Number((browser.getAttribute("viewBox") ?? "").split(/[\s,]+/)[2]);
  const box = browser.getBoundingClientRect();
  // Without layout (or a usable viewBox) nothing can be culled safely.
  if (!(box.width > 0 && viewBoxWidth > 0)) return null;
  const scale = box.width / viewBoxWidth;
  return {
    left: box.left + visible.x * scale - CULL_TOLERANCE,
    right: box.left + (visible.x + visible.width) * scale + CULL_TOLERANCE,
  };
}

export function createTrackSvg(browser: SVGSVGElement, trackIds: readonly string[]) {
  const rendered = Array.from(browser.querySelectorAll<SVGGElement>("[data-track-id]"));
  const frames = [...new Set(trackIds)].map((id) => {
    // Compare IDs directly: track IDs can contain quotes and CSS metacharacters.
    const frame = rendered.find((element) => element.getAttribute("data-track-id") === id);
    if (!frame) throw new Error("The track is not currently rendered.");
    const width = Number(frame.getAttribute("data-track-width"));
    const height = Number(frame.getAttribute("data-track-height"));
    const margin = Number(frame.getAttribute("data-track-margin"));
    if (!(width > 0 && height > 0) || !Number.isFinite(width + height + margin)) {
      throw new Error("The track has no exportable dimensions.");
    }
    return { frame, width, height, margin };
  });
  if (!frames.length) throw new Error("Choose a track to download.");
  const { width, margin } = frames[0];
  const height = frames.reduce((sum, frame) => sum + frame.height, 0);

  const image = createImage(width, height, margin);
  const background = image.firstChild;
  const copyElement = createCopier(browser, { x: margin, width }, true);
  // Keep shared definitions; each selected frame carries its own definitions.
  for (const definitions of browser.querySelectorAll("defs")) {
    if (!frames.some(({ frame }) => frame.contains(definitions))) {
      image.insertBefore(copyElement(definitions)!, background);
    }
  }

  let y = 0;
  for (const { frame, height: frameHeight } of frames) {
    const track = copyElement(frame) as SVGGElement;
    // Position complete frames next to each other, irrespective of intervening tracks.
    track.removeAttribute("transform");
    // Computed CSS transforms override the attribute used for export placement.
    track.style.removeProperty("transform");
    if (y) track.setAttribute("transform", `translate(0,${y})`);
    image.append(track);
    y += frameHeight;
  }
  return serializeImage(image, width, height);
}

export type BrowserImageOptions = {
  marginWidth: number;
  /** Tracks to leave out; the tracks below move up to close the gap. */
  omitTrackIds?: ReadonlySet<string>;
  /** Defaults to true. Without titles, each track's title strip is removed. */
  includeTitles?: boolean;
};

/** Capture the rendered tracks in display order with the browser-wide highlights. */
export function createBrowserSvg(
  browser: SVGSVGElement,
  { marginWidth, omitTrackIds = new Set(), includeTitles = true }: BrowserImageOptions,
) {
  const [, , browserWidth, browserHeight] = (browser.getAttribute("viewBox") ?? "")
    .split(/[\s,]+/)
    .map(Number);
  const trackWidth = browserWidth - marginWidth;
  if (
    !(trackWidth > 0 && browserHeight > 0) ||
    !Number.isFinite(trackWidth + browserHeight + marginWidth)
  ) {
    throw new Error("The browser has no exportable dimensions.");
  }
  const rendered = Array.from(browser.querySelectorAll<SVGGElement>("[data-track-id]"));
  if (!rendered.length) throw new Error("Add a track before downloading.");
  // Frames render in display order.
  const frames = rendered
    .filter((frame) => !omitTrackIds.has(frame.getAttribute("data-track-id")!))
    .map((frame) => {
      const height = Number(frame.getAttribute("data-track-height"));
      const title = includeTitles ? 0 : Number(frame.getAttribute("data-track-title-height")) || 0;
      return { frame, title, height: height - title };
    })
    .filter(({ height }) => height > 0);
  if (!frames.length) throw new Error("Choose at least one track to include in the image.");

  const height = frames.reduce((sum, frame) => sum + frame.height, 0);
  const image = createImage(trackWidth, height, marginWidth);
  const copyElement = createCopier(browser, { x: marginWidth, width: trackWidth }, includeTitles);

  // Highlights span every track, so stretch them to the image's new height.
  const appendHighlights = (type: "filled" | "outlined") => {
    const source = browser.querySelector(`[data-export-highlights="${type}"]`);
    const copy = source && copyElement(source);
    if (!copy) return;
    if (height === browserHeight) {
      image.append(copy);
      return;
    }
    const stretch = document.createElementNS(SVG_NS, "g");
    stretch.setAttribute("transform", `scale(1,${height / browserHeight})`);
    stretch.append(copy);
    image.append(stretch);
  };

  appendHighlights("filled");
  const definitions = document.createElementNS(SVG_NS, "defs");
  let y = 0;
  frames.forEach(({ frame, title, height: frameHeight }, index) => {
    const track = copyElement(frame) as SVGGElement;
    // Restack complete frames, irrespective of omitted tracks.
    track.removeAttribute("transform");
    track.style.removeProperty("transform");
    if (title) {
      // Lift the plot into the title strip and clip away what the strip held.
      const clipId = `genomebrowser-export-frame-${index}`;
      const clip = document.createElementNS(SVG_NS, "clipPath");
      clip.setAttribute("id", clipId);
      const area = document.createElementNS(SVG_NS, "rect");
      area.setAttribute("y", String(title));
      area.setAttribute("width", String(browserWidth));
      area.setAttribute("height", String(frameHeight));
      clip.append(area);
      definitions.append(clip);
      track.setAttribute("clip-path", `url(#${clipId})`);
    }
    if (y - title) track.setAttribute("transform", `translate(0,${y - title})`);
    image.append(track);
    y += frameHeight;
  });
  if (definitions.hasChildNodes()) image.insertBefore(definitions, image.firstChild);
  appendHighlights("outlined");
  return serializeImage(image, trackWidth, height);
}

function createImage(width: number, height: number, margin: number) {
  const image = document.createElementNS(SVG_NS, "svg");
  image.setAttribute("width", String(width));
  image.setAttribute("height", String(height));
  image.setAttribute("viewBox", `${margin} 0 ${width} ${height}`);
  image.style.background = "#ffffff";
  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("x", String(margin));
  background.setAttribute("width", String(width));
  background.setAttribute("height", String(height));
  background.setAttribute("fill", "#ffffff");
  image.append(background);
  return image;
}

function serializeImage(image: SVGSVGElement, width: number, height: number) {
  let markup = "";
  try {
    markup = new XMLSerializer().serializeToString(image);
  } catch {
    // Browsers throw or return "" when the markup exceeds their maximum string length.
  }
  if (!markup) {
    throw new Error("The image is too large to export. Remove some tracks and try again.");
  }
  return {
    blob: new Blob([markup], {
      type: "image/svg+xml;charset=utf-8",
    }),
    width,
    height,
  };
}

export type SvgImage = ReturnType<typeof serializeImage>;

// Common browser canvas limits; larger canvases fail or encode blank images.
const MAX_CANVAS_SIDE = 32767;
const MAX_CANVAS_AREA = 268_435_456;

export async function svgToPng(svg: SvgImage, signal: AbortSignal, scale = 1): Promise<Blob> {
  signal.throwIfAborted();
  const canvasWidth = Math.ceil(svg.width * scale);
  const canvasHeight = Math.ceil(svg.height * scale);
  if (
    canvasWidth > MAX_CANVAS_SIDE ||
    canvasHeight > MAX_CANVAS_SIDE ||
    canvasWidth * canvasHeight > MAX_CANVAS_AREA
  ) {
    throw new Error("The image is too large for PNG. Download SVG or lower the scale instead.");
  }
  const image = new Image();
  let url = "";
  try {
    url = URL.createObjectURL(svg.blob);
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        image.onload = null;
        image.onerror = null;
        signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        image.src = "";
        reject(signal.reason);
      };
      image.onload = () => {
        cleanup();
        resolve();
      };
      image.onerror = () => {
        cleanup();
        reject(new Error("The track image could not be converted to PNG."));
      };
      signal.addEventListener("abort", abort, { once: true });
      image.src = url;
    });
    signal.throwIfAborted();
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PNG export requires browser canvas support.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("The browser could not encode the track as PNG."));
      }, "image/png"),
    );
    signal.throwIfAborted();
    return blob;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

export function saveTrackImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Keep the URL alive until the browser has processed the download click.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
