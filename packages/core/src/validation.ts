import type { z } from "zod";

export function formatZodError(error: z.ZodError, rootLabel = "input") {
  return error.issues
    .map((issue) => `${issue.path.join(".") || rootLabel}: ${issue.message}`)
    .join("; ");
}

export class PublicInputValidationError extends Error {}

export function parsePublicInput<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new PublicInputValidationError(`${label} is invalid: ${formatZodError(result.error)}`);
  }
  return result.data;
}
