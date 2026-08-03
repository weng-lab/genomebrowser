import { z } from "zod";
import type { ModuleRegistry } from "@weng-lab/genomebrowser";
import {
  createCollectionSchema,
  type TrackSelectCollection,
  type TrackSelectView,
} from "./collectionSchema";

const builtInFields = new Set(["id", "title", "type"]);

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "collection"}: ${issue.message}`)
    .join("; ");
}

function parseTrackSelectCollection(
  input: unknown,
  registry: ModuleRegistry,
): TrackSelectCollection {
  const result = createCollectionSchema(registry).safeParse(input);

  if (!result.success) {
    throw new Error(`TrackSelect collection is invalid: ${formatZodError(result.error)}`);
  }

  const rawTracks = isRecord(input) && Array.isArray(input.tracks) ? input.tracks : [];

  return {
    ...result.data,
    tracks: result.data.tracks.map((track, index) => {
      const rawTrack = rawTracks[index];
      if (!isRecord(rawTrack)) return track;

      return {
        ...rawTrack,
        metadata: track.metadata,
      } as TrackSelectCollection["tracks"][number];
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateViewField(
  collection: TrackSelectCollection,
  field: string,
  context: string,
  errors: string[],
) {
  if (builtInFields.has(field)) {
    return;
  }

  collection.tracks.forEach((track, index) => {
    if (!(field in track.metadata)) {
      errors.push(`tracks.${index}.metadata is missing "${field}" required by ${context}`);
    }
  });
}

function validateLeafField(
  collection: TrackSelectCollection,
  view: TrackSelectView,
  errors: string[],
) {
  validateViewField(collection, view.leaf, `views.${view.id}.leaf`, errors);
}

export function validateJson(input: unknown, registry: ModuleRegistry): TrackSelectCollection {
  const collection = parseTrackSelectCollection(input, registry);
  const errors: string[] = [];

  collection.views.forEach((view) => {
    view.columns.forEach((column) => {
      validateViewField(
        collection,
        column.field,
        `views.${view.id}.columns.${column.field}`,
        errors,
      );
    });

    view.grouping.forEach((field) => {
      validateViewField(collection, field, `views.${view.id}.grouping`, errors);
    });

    validateLeafField(collection, view, errors);
  });

  if (errors.length > 0) {
    throw new Error(`TrackSelect collection is invalid: ${errors.join("; ")}`);
  }

  return collection;
}
