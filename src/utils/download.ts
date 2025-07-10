import { Rect } from "../components/tracks/bigbed/types";
import { Domain } from "./types";

export type BedGraphFormat = {
  chrom: string;
  chromStart: number;
  chromEnd: number;
  value: number;
};

export function downloadBedGraph(id: string, data: any[], domain: Domain) {
  const graph = generateBedGraph(data, domain);
  const graphSet = new Set(graph);
  const rows = Array.from(graphSet)
    .map((d: BedGraphFormat) => {
      return `${d.chrom}\t${d.chromStart}\t${d.chromEnd}\t${d.value}`;
    })
    .join("\n");
  const header = `chrom\tchromStart\tchromEnd\tvalue`;
  const outputString = [header, rows].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(outputString);
  a.download = `${id}.bedGraph`;
  a.click();
}

function generateBedGraph(data: any[], domain: Domain): BedGraphFormat[] {
  const step = (domain.end - domain.start) / data.length;
  return data
    .map((d: any, index: number) => {
      const start = Math.floor(domain.start + index * step);
      const end = Math.floor(domain.start + (index + 1) * step);
      // filter out points with the same chromStart and chromEnd
      if (start === end) return null;
      return {
        chrom: domain.chromosome,
        chromStart: start,
        chromEnd: end,
        value: d.value,
      } as BedGraphFormat;
    })
    .filter((d: BedGraphFormat | null) => d !== null);
}

export function downloadBedRegion(id: string, data: Rect[], domain: Domain) {
  const bed = generateBed(data, domain);
  if (bed.length === 0) return;
  const header = `chrom\tchromStart\tchromEnd\tname\tscore\tstrand\titemRgb`;
  const rows = bed
    .map(
      (d: BedFormat) => `${d.chrom}\t${d.chromStart}\t${d.chromEnd}\t${d.name}\t${d.score}\t${d.strand}\t${d.itemRgb}`
    )
    .join("\n");
  const outputString = [header, rows].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(outputString);
  a.download = `${id}.bed`;
  a.click();
}

export type BedFormat = {
  chrom: string;
  chromStart: number;
  chromEnd: number;
  name: string;
  score: number;
  strand: string;
  itemRgb: string;
};

function generateBed(data: Rect[], domain: Domain): BedFormat[] {
  return data.map((d: Rect) => {
    const [r, g, b] = d.color?.match(/\d+/g) || ["0", "0", "0"];
    return {
      chrom: domain.chromosome,
      chromStart: d.start,
      chromEnd: d.end,
      name: d.name,
      score: d.score,
      strand: ".",
      itemRgb: `${r},${g},${b}`,
    } as BedFormat;
  });
}

function getSVG(id: string) {
  const browserSVG = document.getElementById("browserSVG");
  if (!browserSVG) return null;
  return browserSVG.querySelector(`g#wrapper-${id}`);
}

export function downloadSVG(id: string, name: string, ruler: boolean = true) {
  const svg = getSVG(id);
  if (!svg) return;
  const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wrapper.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const clonedSvg = svg.cloneNode(true) as SVGGElement;
  clonedSvg.removeAttribute("transform");
  const marginButtons = clonedSvg.querySelector(`#margin-buttons-${id}`);
  if (marginButtons) {
    marginButtons.remove();
  }

  if (ruler) {
    const rulerElement = document.getElementById("wrapper-ruler");
    if (rulerElement) {
      const clonedRuler = rulerElement.cloneNode(true) as SVGGElement;
      clonedRuler.removeAttribute("transform");
      wrapper.appendChild(clonedRuler);
    }
    clonedSvg.setAttribute("transform", "translate(0, 80)");
  }

  wrapper.appendChild(clonedSvg);

  const svgString = new XMLSerializer().serializeToString(wrapper);
  const a = document.createElement("a");
  a.href = "data:image/svg+xml;base64," + btoa(svgString);
  a.download = `${name}.svg`;
  a.click();
}
