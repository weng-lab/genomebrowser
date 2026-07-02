import { z } from "zod";
import {
  TrackSelectFolderSchema,
  type TrackSelectFolder,
  type TrackSelectView,
} from "./folderSchema";
import {
  getTrackSelectSchemaModule,
  type TrackSelectSchemaSource,
} from "./modules";

const builtInFields = new Set(["id", "title", "type"]);

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "folder"}: ${issue.message}`)
    .join("; ");
}

function parseTrackSelectFolder(input: unknown): TrackSelectFolder {
  const result = TrackSelectFolderSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      `TrackSelect folder is invalid: ${formatZodError(result.error)}`,
    );
  }

  return result.data;
}

function validateViewField(
  folder: TrackSelectFolder,
  field: string,
  context: string,
  errors: string[],
) {
  if (builtInFields.has(field)) {
    return;
  }

  folder.tracks.forEach((track, index) => {
    if (!(field in track.metadata)) {
      errors.push(
        `tracks.${index}.metadata is missing "${field}" required by ${context}`,
      );
    }
  });
}

function validateLeafField(
  folder: TrackSelectFolder,
  view: TrackSelectView,
  errors: string[],
) {
  validateViewField(folder, view.leaf, `views.${view.id}.leaf`, errors);
}

function formatConfigPath(index: number, path: PropertyKey[]) {
  const configPath = path.join(".");
  return configPath
    ? `tracks.${index}.config.${configPath}`
    : `tracks.${index}.config`;
}

function validateTrackConfigs(
  folder: TrackSelectFolder,
  source: TrackSelectSchemaSource,
  errors: string[],
) {
  folder.tracks.forEach((track, index) => {
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

export function validateJson(
  input: unknown,
  source?: TrackSelectSchemaSource,
): TrackSelectFolder {
  const folder = parseTrackSelectFolder(input);
  const errors: string[] = [];

  folder.views.forEach((view) => {
    view.columns.forEach((column) => {
      validateViewField(
        folder,
        column.field,
        `views.${view.id}.columns.${column.field}`,
        errors,
      );
    });

    view.grouping.forEach((field) => {
      validateViewField(folder, field, `views.${view.id}.grouping`, errors);
    });

    validateLeafField(folder, view, errors);
  });

  if (source) {
    validateTrackConfigs(folder, source, errors);
  }

  if (errors.length > 0) {
    throw new Error(`TrackSelect folder is invalid: ${errors.join("; ")}`);
  }

  return folder;
}
