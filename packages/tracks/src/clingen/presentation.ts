import type { TrackTooltipRow } from "../shared/tooltips/trackTooltip";
import { formatGenomicInterval } from "../shared/tooltips/trackTooltipFormatters";
import type { ClinGenItem } from "./types";

export function plainSourceText(value: string) {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, key: string) => {
      const code = key.startsWith("#x")
        ? parseInt(key.slice(2), 16)
        : key.startsWith("#")
          ? Number(key.slice(1))
          : undefined;
      return code !== undefined && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : (entities[key] ?? entity);
    });
}

export function clinGenRows(item: ClinGenItem): TrackTooltipRow[] {
  const common = [
    { label: "Location", value: formatGenomicInterval(item.start, item.end, item.chromosome) },
  ];
  if (item.kind === "haplo" || item.kind === "triplo") {
    return [
      ...common,
      { label: "Gene / region", value: item.geneSymbol },
      { label: "Score", value: item.kind === "haplo" ? item.haploScore : item.triploScore },
      {
        label: "Evidence",
        value: item.kind === "haplo" ? item.haploDescription : item.triploDescription,
      },
      { label: "Evaluated", value: item.dateLastEvaluated },
    ].filter((row) => row.value !== "");
  }
  if (item.kind === "gene-disease") {
    return [
      ...common,
      { label: "Gene", value: item.geneSymbol },
      { label: "Disease", value: item.name },
      { label: "Validity", value: item.Classification },
      { label: "Inheritance", value: item.Inheritance },
      { label: "Curated", value: item.DateCurated },
    ].filter((row) => row.value !== "");
  }
  return [
    ...common,
    { label: "Disease", value: plainSourceText(item.disease) },
    { label: "Panel", value: plainSourceText(item.panel) },
    { label: "Status", value: item.status },
  ].filter((row) => row.value !== "");
}

export type ClinGenLink = { label: string; url: string };
function safeLink(label: string, url: string): ClinGenLink[] {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password
      ? [{ label, url: parsed.href }]
      : [];
  } catch {
    return [];
  }
}

export function clinGenLinks(item: ClinGenItem): ClinGenLink[] {
  if (item.kind === "haplo" || item.kind === "triplo")
    return safeLink("ClinGen dosage sensitivity", item.url);
  if (item.kind === "gene-disease") {
    return item.ClinGenURL
      ? safeLink(
          "ClinGen evidence summary",
          /^https?:\/\//.test(item.ClinGenURL)
            ? item.ClinGenURL
            : `https://search.clinicalgenome.org/kb/gene-validity/${encodeURIComponent(item.ClinGenURL)}`,
        )
      : [];
  }
  return [item.disease, item.panel].flatMap((value) =>
    [...value.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].flatMap(
      (match) => safeLink(plainSourceText(match[3]), plainSourceText(match[2])),
    ),
  );
}
