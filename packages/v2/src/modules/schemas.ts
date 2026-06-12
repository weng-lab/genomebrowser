import { z } from "zod";

export const functionSchema = z.custom<Function>((value) => typeof value === "function", {
  error: "Input must be a function",
});

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
    .join("; ");
}

export function parsePublicInput<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(`${label} is invalid: ${formatZodError(result.error)}`);
  }
  return result.data;
}
