import { z } from "zod";
import type { ModuleRegistry } from "@weng-lab/genomebrowser";

export const TrackSelectMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const TrackSelectColumnSchema = z.strictObject({
  field: z.string().min(1),
  label: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  width: z.number().positive().optional(),
  hidden: z.boolean().optional(),
});

const TrackSelectViewSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  columns: z.array(TrackSelectColumnSchema).min(1),
  grouping: z.array(z.string().min(1)).default([]),
  leaf: z.string().min(1).default("title"),
});

export const TrackSelectCollectionBaseSchema = z.strictObject({
  $schema: z.string().min(1).optional(),
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  views: z.array(TrackSelectViewSchema).min(1),
});

export function createCollectionSchema(registry: ModuleRegistry) {
  if (registry.modules.length === 0) {
    throw new Error("At least one track module is required to generate a TrackSelect schema");
  }

  const entries = registry.modules.map((module) =>
    module.createInputSchema.omit({ source: true }).extend({
      type: z.literal(module.type),
      metadata: z.record(z.string(), TrackSelectMetadataValueSchema).default({}),
    }),
  );

  return TrackSelectCollectionBaseSchema.extend({
    tracks: z.array(
      z.discriminatedUnion(
        "type",
        entries as [(typeof entries)[number], ...Array<(typeof entries)[number]>],
      ),
    ),
  });
}

export type TrackSelectColumn = z.infer<typeof TrackSelectColumnSchema>;
export type TrackSelectView = z.infer<typeof TrackSelectViewSchema>;
export type TrackSelectMetadata = Record<string, string | number | boolean | null>;
export type TrackSelectTrack = {
  type: string;
  id: string;
  title: string;
  display?: string;
  height?: number;
  color?: string;
  config: Record<string, unknown>;
  metadata: TrackSelectMetadata;
};
export type TrackSelectCollection = z.infer<typeof TrackSelectCollectionBaseSchema> & {
  tracks: TrackSelectTrack[];
};
