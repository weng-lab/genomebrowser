import { z } from "zod";
import { defineStateCommand } from "./define";
import {
  metadataFieldInputSchema,
  metadataSetInputSchema,
  metadataValueSchema,
} from "./trackMetadataSchema";

export const setTrackMetadata = defineStateCommand({
  name: "set_track_metadata",
  description:
    'Set or remove metadata fields on one or more loaded tracks, such as tagging tracks the user finds interesting. Fields in "set" are added or replace existing values; fields in "remove" are deleted; other fields stay. The same change applies to every listed track, and either every track changes or none does. The metadata on each track has a size limit; a change that would pass it fails and says so. Get track IDs and current fields from list_tracks. Returns each track\'s metadata after the change.',
  params: z.strictObject({
    trackIds: z
      .array(z.string().min(1))
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, "Track IDs must not repeat")
      .describe("IDs of the tracks to change."),
    set: metadataSetInputSchema
      .optional()
      .describe(
        'Fields to add or replace, such as { "Interesting": true } or { "Status": "abnormal" }. Values are text, numbers, true or false, or null. "id", "title", and "type" are reserved for the track\'s own values.',
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
  run(snapshot, { trackIds, set = {}, remove = [] }, { planTrackMetadata }) {
    if (Object.keys(set).length === 0 && remove.length === 0) {
      return { ok: false, code: "INVALID_PARAMS", error: "Give fields to set or remove" };
    }
    const both = remove.filter((field) => Object.hasOwn(set, field));
    if (both.length > 0) {
      const fields = both.map((field) => `"${field}"`).join(", ");
      return { ok: false, code: "INVALID_PARAMS", error: `Fields both set and removed: ${fields}` };
    }
    const planned = planTrackMetadata(snapshot.tracks, trackIds, { set, remove });
    if (!planned.ok) return planned;
    const byId = new Map(planned.tracks.map(({ id, metadata }) => [id, metadata] as const));
    const tracks = snapshot.tracks.map((track) => {
      const metadata = byId.get(track.base.id);
      return metadata ? { ...track, metadata } : track;
    });
    return {
      ok: true,
      value: { tracks: planned.tracks },
      snapshot: { ...snapshot, tracks },
    };
  },
});
