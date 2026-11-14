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
