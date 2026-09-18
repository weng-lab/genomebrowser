import { z } from "zod";
import type { AnyTrackModule } from "../modules/types";
import {
  createTrackCollectionSchema,
  type TrackCollection,
  type TrackCollectionView,
} from "./collectionSchema";

const builtInFields = new Set(["id", "title", "type"]);

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "collection"}: ${issue.message}`)
    .join("; ");
}

function parseTrackCollection<Modules extends readonly AnyTrackModule[]>(
  input: unknown,
  modules: Modules,
) {
  const result = createTrackCollectionSchema(modules).safeParse(input);

  if (!result.success) {
    throw new Error(`Track collection is invalid: ${formatZodError(result.error)}`);
  }

  // Execute module schemas to validate, but discard their track output so creation
  // transforms authored values rather than transforming already-parsed values.
  return { ...result.data, tracks: (input as TrackCollection<Modules>).tracks };
}

function validateViewField(
  collection: TrackCollection,
  field: string,
  context: string,
  errors: string[],
) {
  if (builtInFields.has(field)) {
    return;
  }

  collection.tracks.forEach((track, index) => {
    if (!(field in (track.metadata ?? {}))) {
      errors.push(`tracks.${index}.metadata is missing "${field}" required by ${context}`);
    }
  });
}

function validateLeafField(
  collection: TrackCollection,
  view: NonNullable<TrackCollection["views"]>[number],
  errors: string[],
) {
  validateViewField(collection, view.leaf ?? "title", `views.${view.id}.leaf`, errors);
}

export function validateTrackCollection<const Modules extends readonly AnyTrackModule[]>(
  input: unknown,
  modules: Modules,
): Omit<TrackCollection<Modules>, "views"> & { views?: TrackCollectionView[] } {
  const collection = parseTrackCollection(input, modules);
  const errors: string[] = [];

  const trackIds = new Set<string>();
  collection.tracks.forEach((track, index) => {
    if (trackIds.has(track.base.id))
      errors.push(`tracks.${index}.base.id duplicates "${track.base.id}"`);
    trackIds.add(track.base.id);
  });
  const viewIds = new Set<string>();
  collection.views?.forEach((view) => {
    if (viewIds.has(view.id)) errors.push(`views contains duplicate id "${view.id}"`);
    viewIds.add(view.id);
    view.columns.forEach((column) => {
      validateViewField(
        collection,
        column.field,
        `views.${view.id}.columns.${column.field}`,
        errors,
      );
    });

    view.grouping?.forEach((field) => {
      validateViewField(collection, field, `views.${view.id}.grouping`, errors);
    });

    validateLeafField(collection, view, errors);
  });

  if (errors.length > 0) {
    throw new Error(`Track collection is invalid: ${errors.join("; ")}`);
  }

  return collection;
}
