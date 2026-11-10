import { z } from "zod";

/** Track types a file URL can be added as, named by their track module types. */
export const urlTrackTypeSchema = z.enum(["bigwig", "bigbed", "gene", "ccre-bigbed", "bam"]);

export type UrlTrackType = z.infer<typeof urlTrackTypeSchema>;
