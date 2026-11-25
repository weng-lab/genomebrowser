import { z } from "zod";
import { defineStateCommand } from "./define";
import { metadataValueSchema } from "./trackMetadataSchema";

export const listTracks = defineStateCommand({
  name: "list_tracks",
  readonly: true,
  description:
    "List the loaded tracks from top to bottom: each track's ID, title, type, whether it is pinned to the top, and its metadata. Metadata holds descriptive fields, such as assay or cell type, and tags the user added. Use the IDs with set_track_metadata.",
  params: z.strictObject({}),
  result: z.strictObject({
    tracks: z.array(
      z.strictObject({
        id: z.string(),
        title: z.string(),
        type: z.string(),
        pinned: z.boolean(),
        metadata: z.record(z.string(), metadataValueSchema),
      }),
    ),
  }),
  run(snapshot) {
    const pinned = new Set(snapshot.pinnedTrackIds);
    return {
      ok: true,
      value: {
        tracks: snapshot.tracks.map(({ type, base, metadata }) => ({
          id: base.id,
          title: base.title,
          type,
          pinned: pinned.has(base.id),
          metadata: metadata ?? {},
        })),
      },
    };
  },
});
