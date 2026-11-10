import { z } from "zod";
import { urlTrackTypeSchema } from "../../browser/urlTrackTypes";
import { defineCommand } from "./define";

const track = z.strictObject({
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
});

export const addTracksFromUrls = defineCommand({
  name: "add_tracks_from_urls",
  description:
    "Add one or more tracks from the URLs of hosted genomic files, after checking that the browser can read each one. Types: bigwig (.bw, .bigWig), bigbed (.bb, .bigBed), bam (.bam, with a BAI index), gene (a BigGenePred BigBed file), and ccre-bigbed (an ENCODE cCRE BigBed file). The type is inferred from the file extension; pass type for gene and cCRE files, or when the URL has no such extension. Plain-text BED, bedGraph, and WIG files cannot be added; convert them to BigBed or BigWig first. The host must support byte-range requests and allow the browser to fetch the file (CORS). Adds every track or none: if any cannot be added, nothing is added and the error gives each failing URL with its reason. The tracks are added below the others, in the order given, and saved with the session, unless the session lacks room for all of them. Returns each track's ID, title, and type, in order.",
  params: z.strictObject({
    tracks: z.array(track).min(1).describe("The tracks to add, in order."),
  }),
  result: z.strictObject({
    tracks: z.array(
      z.strictObject({ id: z.string(), title: z.string(), type: urlTrackTypeSchema }),
    ),
  }),
  async run({ addTracksFromUrls }, { tracks }, signal) {
    const outcome = await addTracksFromUrls(tracks, signal);
    return outcome.ok ? { ok: true, value: { tracks: outcome.tracks } } : outcome;
  },
});
