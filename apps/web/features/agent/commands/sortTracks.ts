import { z } from "zod";
import { defineStateCommand } from "./define";

export const sortTracks = defineStateCommand({
  name: "sort_tracks",
  description:
    'Sort the loaded tracks once, like the Sort tracks button. Tracks order by the first field, and each later field breaks ties. Fields: "title" (track title), "type" (track type), and "meta:<name>" for a metadata field any loaded track has, named as list_tracks shows it, such as "meta:Cell type". Numbers sort numerically, text in natural order ignoring case (so "rep2" comes before "rep10"), and false before true. Each field sorts ascending unless its direction is "descending"; tracks without a value for a field go last either way. Pinned tracks keep their positions, and tracks that tie on every field keep their current order. Tracks added later are not sorted until you sort again. Returns every track in its new order.',
  params: z.strictObject({
    by: z
      .array(
        z.strictObject({
          field: z.string().min(1).describe('A field ID, such as "title" or "meta:Assay".'),
          direction: z
            .enum(["ascending", "descending"])
            .optional()
            .describe("Defaults to ascending."),
        }),
      )
      .min(1)
      .refine(
        (sort) => new Set(sort.map(({ field }) => field)).size === sort.length,
        "Fields must not repeat",
      )
      .describe(
        'Fields in priority order, such as [{ "field": "type" }, { "field": "title", "direction": "descending" }].',
      ),
  }),
  result: z.strictObject({
    tracks: z.array(z.strictObject({ id: z.string(), title: z.string() })),
  }),
  run(snapshot, { by }, { sortTracks }) {
    const outcome = sortTracks(snapshot.tracks, snapshot.pinnedTrackIds, by);
    if (!outcome.ok) return outcome;
    return {
      ok: true,
      value: {
        tracks: outcome.tracks.map(({ base }) => ({ id: base.id, title: base.title })),
      },
      snapshot: { ...snapshot, tracks: outcome.tracks },
    };
  },
});
