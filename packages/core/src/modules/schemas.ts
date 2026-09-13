import { z } from "zod";

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Expected a six-digit hexadecimal color in #RRGGBB format");

export const trackBaseSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  display: z.string().min(1),
  height: z.number().positive(),
  color: hexColorSchema,
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
