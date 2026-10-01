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

function cloneWithPresentation(source: Element): Element {
  const copy = source.cloneNode(false) as Element;
  const computed = getComputedStyle(source);
  for (const property of presentationProperties) {
    const value = computed.getPropertyValue(property);
    if (value) {
      // Browsers can resolve local SVG references against the page URL.
      const localValue = value.replace(/url\(["']?[^)"']*#([^)"']+)["']?\)/g, "url(#$1)");
      (copy as SVGElement).style.setProperty(property, localValue);
    }
  }
  for (const child of source.childNodes) {
    if (child instanceof Element) {
      if (!child.hasAttribute("data-track-export-exclude"))
        copy.append(cloneWithPresentation(child));
    } else {
      copy.append(child.cloneNode(true));
    }
  }
  return copy;
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

  const image = document.createElementNS(SVG_NS, "svg");
  image.setAttribute("width", String(width));
  image.setAttribute("height", String(height));
  image.setAttribute("viewBox", `${margin} 0 ${width} ${height}`);
  image.style.background = "#ffffff";
  // Keep shared definitions; each selected frame carries its own definitions.
  for (const definitions of browser.querySelectorAll("defs")) {
    if (!frames.some(({ frame }) => frame.contains(definitions))) {
      image.append(cloneWithPresentation(definitions));
    }
  }
  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("x", String(margin));
  background.setAttribute("width", String(width));
  background.setAttribute("height", String(height));
  background.setAttribute("fill", "#ffffff");
  image.append(background);

  let y = 0;
  for (const { frame, height: frameHeight } of frames) {
    const track = cloneWithPresentation(frame) as SVGGElement;
    // Position complete frames next to each other, irrespective of intervening tracks.
    track.removeAttribute("transform");
    // Computed CSS transforms override the attribute used for export placement.
    track.style.removeProperty("transform");
    if (y) track.setAttribute("transform", `translate(0,${y})`);
    image.append(track);
    y += frameHeight;
  }
  return {
    blob: new Blob([new XMLSerializer().serializeToString(image)], {
      type: "image/svg+xml;charset=utf-8",
    }),
    width,
    height,
  };
}

export async function svgToPng(
  svg: ReturnType<typeof createTrackSvg>,
  signal: AbortSignal,
): Promise<Blob> {
  signal.throwIfAborted();
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
    canvas.width = Math.ceil(svg.width);
    canvas.height = Math.ceil(svg.height);
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
