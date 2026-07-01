import type { z } from "zod";

export type TrackSelectSchemaModule = {
  type: string;
  createInputSchema: z.ZodType<unknown>;
};

export type TrackSelectSchemaRegistry = {
  get(type: string): TrackSelectSchemaModule;
};

export type TrackSelectSchemaSource = TrackSelectSchemaModule[] | TrackSelectSchemaRegistry;

export function getTrackSelectSchemaModule(source: TrackSelectSchemaSource, type: string) {
  if (!Array.isArray(source)) {
    return source.get(type);
  }

  const module = source.find((candidate) => candidate.type === type);
  if (!module) {
    throw new Error(`No track module registered for type: ${type}`);
  }

  return module;
}
