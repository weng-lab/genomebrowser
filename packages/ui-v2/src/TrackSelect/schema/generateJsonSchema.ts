import { z } from "zod";
import {
  TrackSelectFolderSchema,
  TrackSelectMetadataValueSchema,
} from "./folderSchema";
import type { TrackSelectSchemaModule } from "./modules";

export function generateTrackSelectFolderJsonSchema(
  modules: TrackSelectSchemaModule[],
) {
  const schema = TrackSelectFolderSchema.extend({
    tracks: z.array(createTrackEntrySchema(modules)),
  });

  return z.toJSONSchema(schema, { io: "input" });
}

export const genereteSchema = generateTrackSelectFolderJsonSchema;

function createTrackEntrySchema(modules: TrackSelectSchemaModule[]) {
  if (modules.length === 0) {
    throw new Error(
      "At least one track module is required to generate a TrackSelect schema",
    );
  }

  const schemas = modules.map((module) =>
    z.strictObject({
      type: z.literal(module.type),
      config: module.createInputSchema,
      metadata: z
        .record(z.string(), TrackSelectMetadataValueSchema)
        .default({}),
    }),
  );

  if (schemas.length === 1) {
    return schemas[0];
  }

  return z.discriminatedUnion("type", schemas as never);
}
