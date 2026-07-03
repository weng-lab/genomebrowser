import { z } from "zod";

export const TrackSelectMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const trackCreateInputSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    display: z.string().min(1).optional(),
    height: z.number().positive().optional(),
    color: z.string().min(1).optional(),
  })
  .catchall(z.unknown());

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

const TrackSelectTrackSchema = z.strictObject({
  type: z.string().min(1),
  config: trackCreateInputSchema,
  metadata: z.record(z.string(), TrackSelectMetadataValueSchema).default({}),
});

export const TrackSelectCatalogSchema = z.strictObject({
  $schema: z.string().min(1).optional(),
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  views: z.array(TrackSelectViewSchema).min(1),
  tracks: z.array(TrackSelectTrackSchema),
});

export type TrackSelectColumn = z.infer<typeof TrackSelectColumnSchema>;
export type TrackSelectView = z.infer<typeof TrackSelectViewSchema>;
export type TrackSelectTrack = z.infer<typeof TrackSelectTrackSchema>;
export type TrackSelectCatalog = z.infer<typeof TrackSelectCatalogSchema>;
