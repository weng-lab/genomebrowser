import { z } from "zod";
import {
  bigBedPresetSchema,
  trackVisibilitySchema,
  urlTrackTypeSchema,
} from "../../browser/urlTrackTypes";
import { defineBrowserCommand } from "./define";
import { metadataSetInputSchema } from "./trackMetadataSchema";

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
  bedSchema: bigBedPresetSchema
    .optional()
    .describe(
      "bigbed only: the standard BED columns to read, such as bed6 for UCSC's `bigBed 6`. Omit to choose them from the file's header.",
    ),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Expected a color in #RRGGBB format")
    .optional()
    .describe("Track color as #RRGGBB. Omit for the type's default color."),
  visibility: trackVisibilitySchema
    .optional()
    .describe(
      "UCSC visibility, shown as the nearest display the track type has. Omit for the type's default display.",
    ),
  metadata: metadataSetInputSchema
    .optional()
    .describe(
      'Fields describing the track, such as { "Cell type": "K562", "Assay": "ChIP-seq" }. Values are text, numbers, true or false, or null. "id", "title", and "type" are reserved for the track\'s own values.',
    ),
});

export const addTracksFromUrls = defineBrowserCommand({
  name: "add_tracks_from_urls",
  description:
    "Add one or more tracks from the URLs of hosted genomic files, after checking that the browser can read each one. Types: bigwig (.bw, .bigWig), bigbed (.bb, .bigBed), bam (.bam, with a BAI index), gene (a BigGenePred BigBed file), and ccre-bigbed (an ENCODE cCRE BigBed file). The type is inferred from the file extension; pass type for gene and cCRE files, or when the URL has no such extension. Plain-text BED, bedGraph, and WIG files cannot be added; convert them to BigBed or BigWig first. Each track can also be given a color, a UCSC visibility, the BED columns of a BigBed file, and metadata fields, which have a size limit per track. The host must support byte-range requests and allow the browser to fetch the file (CORS). Adds every track or none: if any cannot be added, nothing is added and the error gives each failing URL with its reason. The tracks are added below the others, in the order given, and saved with the session, unless the session lacks room for all of them. Returns each track's ID, title, and type, in order.",
  params: z.strictObject({
    tracks: z.array(track).min(1).describe("The tracks to add, in order."),
  }),
  // Checks of a large batch or a slow host can take more than five seconds. MCP clients built
  // on the official SDKs stop waiting for a request after 60 seconds by default.
  timeoutMs: 45_000,
  result: z.strictObject({
    tracks: z.array(
      z.strictObject({ id: z.string(), title: z.string(), type: urlTrackTypeSchema }),
    ),
  }),
  async run({ addTracksFromUrls }, { tracks }, signal) {
    const outcome = await addTracksFromUrls(tracks, signal);
    if (outcome.ok) return { ok: true, value: { tracks: outcome.tracks } };
    // The error names each failing URL, so the agent needs no list beside it.
    return { ok: false, code: outcome.code, error: outcome.error };
  },
});
