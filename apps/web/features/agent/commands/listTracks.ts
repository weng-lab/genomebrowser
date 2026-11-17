import { z } from "zod";
import { defineCommand } from "./define";
import { metadataValueSchema } from "./trackMetadataSchema";

export const listTracks = defineCommand({
  name: "list_tracks",
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
  run({ stores }) {
    const { tracks, pinnedTrackIds } = stores.useTrackStore.getState();
    const pinned = new Set(pinnedTrackIds);
    return {
      ok: true,
      value: {
        tracks: tracks.map(({ type, base, metadata }) => ({
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
