import type { BedSchemaKey } from "@weng-lab/genomebrowser-tracks/shared";
import { z } from "zod";

/** Track types a file URL can be added as, named by their track module types. */
export const urlTrackTypeSchema = z.enum(["bigwig", "bigbed", "gene", "ccre-bigbed", "bam"]);

export type UrlTrackType = z.infer<typeof urlTrackTypeSchema>;

/**
 * UCSC's track visibilities, which a request maps to the nearest display its track type has.
 * UCSC's `hide` isn't one, since tracks can't be hidden: a request without one gets the type's
 * default display.
 */
export const trackVisibilitySchema = z.enum(["dense", "squish", "pack", "full"]);

export type TrackVisibility = z.infer<typeof trackVisibilitySchema>;

/** The BigBed presets made only of standard BED columns, which a request can choose. */
export const bigBedPresetSchema = z.enum([
  "bed3",
  "bed4",
  "bed5",
  "bed6",
  "bed9",
] as const satisfies readonly BedSchemaKey[]);

export type BigBedPreset = z.infer<typeof bigBedPresetSchema>;

/** Each type's name in the Add tracks dialog, which a table of tracks may also use. */
export const urlTrackTypeLabels: Record<UrlTrackType, string> = {
  bigwig: "BigWig",
  bigbed: "BigBed",
  gene: "Gene (BigGenePred)",
  "ccre-bigbed": "cCRE (BigBed)",
  bam: "BAM",
};
