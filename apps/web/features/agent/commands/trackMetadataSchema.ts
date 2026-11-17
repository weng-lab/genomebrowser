import { z } from "zod";

/** A stored metadata value: text, a number, true or false, or null. */
export const metadataValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

// Limits on what an agent writes, so one command can't fill a session with metadata.
// Values already on tracks, such as long collection descriptions, aren't limited.

/** A metadata field name an agent sets or removes. */
export const metadataFieldInputSchema = z.string().min(1).max(100);

/** A metadata value an agent sets. */
export const metadataValueInputSchema = z.union([
  z.string().max(1000),
  z.number(),
  z.boolean(),
  z.null(),
]);

// Collection views and sorting use these names for a track's own ID, title, and type, so a
// metadata field with one of them would be hidden there.
const builtInFields = new Set(["id", "title", "type"]);

/**
 * Fields an agent sets. Refining the whole record, not each key, keeps the message: zod reports
 * a failed key only as an invalid key. Removing a field with a built-in name stays allowed.
 */
export const metadataSetInputSchema = z
  .record(metadataFieldInputSchema, metadataValueInputSchema)
  .refine(
    (fields) => !Object.keys(fields).some((field) => builtInFields.has(field)),
    "id, title, and type name a track's built-in values; use another field name",
  );
