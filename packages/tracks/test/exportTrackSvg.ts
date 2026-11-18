import { exportBrowserImage } from "@weng-lab/genomebrowser";

/** Snapshot the exported artifact, replacing generated SVG IDs consistently. */
export async function exportTrackSvg(svg: SVGSVGElement) {
  const image = await exportBrowserImage(svg, "svg");
  const text =
    typeof image.blob.text === "function"
      ? await image.blob.text()
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsText(image.blob);
        });
  const ids = new Map<string, string>();
  for (const match of text.matchAll(/id="(_r_[^" ]+)"/g)) ids.set(match[1], `snapshot-${ids.size}`);
  return text.replace(/_r_[\w-]+/g, (id) => ids.get(id) ?? id);
}
