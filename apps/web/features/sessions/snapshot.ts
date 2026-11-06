import {
  browserSettingsSchema,
  trackBaseSchema,
  trackSourceSchema,
} from "@weng-lab/genomebrowser/schemas";
import { regionSchema } from "../browser/region";
import { z } from "zod";

/**
 * Serializable browser and track configuration of one session. `browser.assembly`
 * is the session's only assembly value. Runtime store state, actions, and
 * registered modules are not part of a snapshot.
 */
export const sessionSnapshotSchema = z.strictObject({
  version: z.literal(1),
  browser: browserSettingsSchema
    .extend({
      assembly: z.string().min(1),
      region: regionSchema,
    })
    .strict(),
  tracks: z.array(
    z.strictObject({
      type: z.string().min(1),
      base: trackBaseSchema,
      config: z.record(z.string(), z.json()),
      source: trackSourceSchema,
    }),
  ),
  pinnedTrackIds: z.array(z.string().min(1)),
});

export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;
