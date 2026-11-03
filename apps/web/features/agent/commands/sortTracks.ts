import { z } from "zod";
import { defineCommand } from "./define";

export const sortTracks = defineCommand({
  name: "sort_tracks",
  description:
    'Sort the loaded tracks once, like the Sort tracks button. Tracks order by the first field, and each later field breaks ties. Fields: "title" (track title, natural order ignoring case) and "type" (track type). Pinned tracks keep their positions, and tracks that tie on every field keep their current order. Tracks added later are not sorted until you sort again. Returns every track in its new order.',
  params: z.strictObject({
    by: z
      .array(z.string().min(1))
      .min(1)
      .refine((fields) => new Set(fields).size === fields.length, "Fields must not repeat")
      .describe('Field IDs in priority order, such as ["type", "title"].'),
  }),
  result: z.strictObject({
    tracks: z.array(z.strictObject({ id: z.string(), title: z.string() })),
  }),
  run({ stores, sortTracks }, { by }) {
    const outcome = sortTracks(by);
    if (!outcome.ok) return outcome;
    const tracks = stores.useTrackStore
      .getState()
      .tracks.map(({ base }) => ({ id: base.id, title: base.title }));
    return { ok: true, value: { tracks } };
  },
});
