import { z } from "zod";
import {
  TrackSelectCatalogSchema,
  type TrackSelectCatalog,
  type TrackSelectView,
} from "./catalogSchema";
import { getTrackSelectSchemaModule, type TrackSelectSchemaSource } from "./modules";

const builtInFields = new Set(["id", "title", "type"]);

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "catalog"}: ${issue.message}`)
    .join("; ");
}

function parseTrackSelectCatalog(input: unknown): TrackSelectCatalog {
  const result = TrackSelectCatalogSchema.safeParse(input);

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

function formatConfigPath(index: number, path: PropertyKey[]) {
  const configPath = path.join(".");
  return configPath ? `tracks.${index}.config.${configPath}` : `tracks.${index}.config`;
}

function validateTrackConfigs(
  catalog: TrackSelectCatalog,
  source: TrackSelectSchemaSource,
  errors: string[],
) {
  catalog.tracks.forEach((track, index) => {
    let module: ReturnType<typeof getTrackSelectSchemaModule>;
    try {
      module = getTrackSelectSchemaModule(source, track.type);
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `tracks.${index}.type: ${error.message}`
          : `tracks.${index}.type: Unknown module error`,
      );
      return;
    }

    const result = module.createInputSchema.safeParse(track.config);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        errors.push(`${formatConfigPath(index, issue.path)}: ${issue.message}`);
      });
    }
  });
}

export function validateJson(input: unknown, source?: TrackSelectSchemaSource): TrackSelectCatalog {
  const catalog = parseTrackSelectCatalog(input);
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

  if (source) {
    validateTrackConfigs(catalog, source, errors);
  }

  if (errors.length > 0) {
    throw new Error(`TrackSelect catalog is invalid: ${errors.join("; ")}`);
  }

  return catalog;
}
