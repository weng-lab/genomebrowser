import { z } from "zod";
import { defineCommand } from "./define";
import {
  metadataFieldInputSchema,
  metadataValueInputSchema,
  metadataValueSchema,
} from "./trackMetadataSchema";

export const setTrackMetadata = defineCommand({
  name: "set_track_metadata",
  description:
    'Set or remove metadata fields on one or more loaded tracks, such as tagging tracks the user finds interesting. Fields in "set" are added or replace existing values; fields in "remove" are deleted; other fields stay. The same change applies to every listed track, and either every track changes or none does. Get track IDs and current fields from list_tracks. Returns each track\'s metadata after the change.',
  params: z.strictObject({
    trackIds: z
      .array(z.string().min(1))
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, "Track IDs must not repeat")
      .describe("IDs of the tracks to change."),
    set: z
      .record(metadataFieldInputSchema, metadataValueInputSchema)
      .optional()
      .describe(
        'Fields to add or replace, such as { "Interesting": true } or { "Status": "abnormal" }. Values are text, numbers, true or false, or null.',
      ),
    remove: z
      .array(metadataFieldInputSchema)
      .optional()
      .describe("Names of fields to delete. Names a track doesn't have are ignored."),
  }),
  result: z.strictObject({
    tracks: z.array(
      z.strictObject({ id: z.string(), metadata: z.record(z.string(), metadataValueSchema) }),
    ),
  }),
  // MCP extends these parameters, which zod refuses for object-level refinements, so the checks
  // across fields happen here.
  run({ changeTrackMetadata }, { trackIds, set = {}, remove = [] }) {
    if (Object.keys(set).length === 0 && remove.length === 0) {
      return { ok: false, code: "INVALID_PARAMS", error: "Give fields to set or remove" };
    }
    const both = remove.filter((field) => field in set);
    if (both.length > 0) {
      const fields = both.map((field) => `"${field}"`).join(", ");
      return { ok: false, code: "INVALID_PARAMS", error: `Fields both set and removed: ${fields}` };
    }
    const outcome = changeTrackMetadata(trackIds, { set, remove });
    if (!outcome.ok) return outcome;
    return { ok: true, value: { tracks: outcome.tracks } };
  },
});
