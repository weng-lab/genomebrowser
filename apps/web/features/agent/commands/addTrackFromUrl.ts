import { z } from "zod";
import { urlTrackTypeSchema } from "../../browser/urlTrackTypes";
import { defineCommand } from "./define";

export const addTrackFromUrl = defineCommand({
  name: "add_track_from_url",
  description:
    "Add a track from the URL of a hosted genomic file, after checking that the browser can read it. Types: bigwig (.bw, .bigWig), bigbed (.bb, .bigBed), bam (.bam, with a BAI index), gene (a BigGenePred BigBed file), and ccre-bigbed (an ENCODE cCRE BigBed file). The type is inferred from the file extension; pass type for gene and cCRE files, or when the URL has no such extension. Plain-text BED, bedGraph, and WIG files cannot be added; convert them to BigBed or BigWig first. The host must support byte-range requests and allow the browser to fetch the file (CORS). The track is added below the others and saved with the session. Returns its ID, title, and type.",
  params: z.strictObject({
    url: z.string().min(1).describe("Absolute HTTP or HTTPS URL of the file."),
    type: urlTrackTypeSchema
      .optional()
      .describe("Track type. Omit to infer it from the URL's file extension."),
    title: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Track title. Omit to use the file name without its extension."),
    indexUrl: z
      .string()
      .min(1)
      .optional()
      .describe("BAM only: URL of the BAI index. Omit to use the BAM URL with .bai added."),
  }),
  result: z.strictObject({ id: z.string(), title: z.string(), type: urlTrackTypeSchema }),
  async run({ addTrackFromUrl }, params, signal) {
    const outcome = await addTrackFromUrl(params, signal);
    return outcome.ok ? { ok: true, value: outcome.track } : outcome;
  },
});
