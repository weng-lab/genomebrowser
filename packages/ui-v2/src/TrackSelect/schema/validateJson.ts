import { z } from "zod";
import type { ModuleRegistry } from "@weng-lab/genomebrowser-v2";
import {
  createCatalogSchema,
  type TrackSelectCatalog,
  type TrackSelectView,
} from "./catalogSchema";

const builtInFields = new Set(["id", "title", "type"]);

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "catalog"}: ${issue.message}`)
    .join("; ");
}

function parseTrackSelectCatalog(input: unknown, registry: ModuleRegistry): TrackSelectCatalog {
  const result = createCatalogSchema(registry).safeParse(input);

  if (!result.success) {
    throw new Error(`TrackSelect catalog is invalid: ${formatZodError(result.error)}`);
  }

  return result.data;
}

function validateViewField(
  catalog: TrackSelectCatalog,
  field: string,
  context: string,
  errors: string[],
) {
  if (builtInFields.has(field)) {
    return;
  }

  catalog.tracks.forEach((track, index) => {
    if (!(field in track.metadata)) {
      errors.push(`tracks.${index}.metadata is missing "${field}" required by ${context}`);
    }
  });
}

function validateLeafField(catalog: TrackSelectCatalog, view: TrackSelectView, errors: string[]) {
  validateViewField(catalog, view.leaf, `views.${view.id}.leaf`, errors);
}

export function validateJson(input: unknown, registry: ModuleRegistry): TrackSelectCatalog {
  const catalog = parseTrackSelectCatalog(input, registry);
  const errors: string[] = [];

  catalog.views.forEach((view) => {
    view.columns.forEach((column) => {
      validateViewField(catalog, column.field, `views.${view.id}.columns.${column.field}`, errors);
    });

    view.grouping.forEach((field) => {
      validateViewField(catalog, field, `views.${view.id}.grouping`, errors);
    });

    validateLeafField(catalog, view, errors);
  });

  if (errors.length > 0) {
    throw new Error(`TrackSelect catalog is invalid: ${errors.join("; ")}`);
  }

  return catalog;
}
