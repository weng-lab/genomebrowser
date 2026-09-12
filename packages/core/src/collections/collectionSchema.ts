import { z } from "zod";
import type { AnyTrackModule } from "../modules/types";
import type { TrackCollectionEntry } from "../modules/registry";

export const TrackMetadataValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const TrackCollectionColumnSchema = z.strictObject({
  field: z.string().min(1),
  label: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  width: z.number().positive().optional(),
  hidden: z.boolean().optional(),
});

export const TrackCollectionViewSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  columns: z.array(TrackCollectionColumnSchema).min(1),
  grouping: z.array(z.string().min(1)).default([]),
  leaf: z.string().min(1).default("title"),
});

export const TrackCollectionBaseSchema = z.strictObject({
  $schema: z.string().min(1).optional(),
  assembly: z.string().min(1),
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  views: z.array(TrackCollectionViewSchema).min(1).optional(),
});

export function createTrackCollectionSchema(modules: readonly AnyTrackModule[]) {
  if (modules.length === 0) {
    throw new Error("At least one track module is required to generate a track collection schema");
  }

  const types = new Set<string>();
  for (const module of modules) {
    if (types.has(module.type)) {
      throw new Error(`Duplicate track module type: ${module.type}`);
    }
    types.add(module.type);
  }

  const entries = modules.map((module) =>
    module.createInputSchema.omit({ source: true }).extend({
      type: z.literal(module.type),
      metadata: z.record(z.string(), TrackMetadataValueSchema).optional(),
    }),
  );

  return TrackCollectionBaseSchema.extend({
    tracks: z.array(
      z.discriminatedUnion(
        "type",
        entries as [(typeof entries)[number], ...Array<(typeof entries)[number]>],
      ),
    ),
  });
}

export type TrackCollectionColumn = z.infer<typeof TrackCollectionColumnSchema>;
export type TrackCollectionView = z.infer<typeof TrackCollectionViewSchema>;
export type TrackMetadata = Record<string, string | number | boolean | null>;
export type TrackCollectionTrack = Omit<TrackCollectionEntry, "source">;
export type TrackCollection = z.input<typeof TrackCollectionBaseSchema> & {
  tracks: TrackCollectionTrack[];
};
