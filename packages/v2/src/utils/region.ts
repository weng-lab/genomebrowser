import { z } from "zod";
import { parsePublicInput } from "../modules/schemas";

export type BrowserRegion = {
  chromosome: string;
  start: number;
  end: number;
};

export const browserRegionSchema = z
  .object({
    chromosome: z.string().min(1),
    start: z.number().finite().int().nonnegative(),
    end: z.number().finite().int().positive(),
  })
  .refine((region) => region.start < region.end, {
    message: "start must be less than end",
    path: ["start"],
  });

export function parseRegion(region: BrowserRegion | string): BrowserRegion {
  if (typeof region !== "string") {
    return parsePublicInput(browserRegionSchema, region, "Region");
  }

  const normalized = region.replace(/,/g, "");
  const match = /^(?<chromosome>[^:]+):(?<start>\d+)-(?<end>\d+)$/.exec(normalized);
  if (!match?.groups) {
    throw new Error(`Invalid region: ${region}`);
  }

  const parsed = {
    chromosome: match.groups.chromosome,
    start: Number(match.groups.start),
    end: Number(match.groups.end),
  };
  return parsePublicInput(browserRegionSchema, parsed, "Region");
}

export function regionLength(region: BrowserRegion) {
  return region.end - region.start;
}

export function formatLength(length: number): string {
  if (length >= 1e9) return `${Math.round(length / 1e9)} Gb`;
  if (length >= 1e6) return `${Math.round(length / 1e6)} Mb`;
  if (length >= 1e3) return `${Math.round(length / 1e3)} kb`;
  return `${length} bp`;
}
