import { z } from "zod";

export const trackConfigBaseSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  display: z.string().min(1),
  height: z.number().positive(),
  color: z.string().optional(),
});

export const trackConfigListSchema = z.array(trackConfigBaseSchema);

export function validateTrackConfigBase<T>(track: T, label = "Track"): T {
  parsePublicInput(trackConfigBaseSchema, track, label);
  return track;
}

export function validateTrackConfigBaseList<T>(tracks: T[], label = "Track list"): T[] {
  for (const track of tracks) {
    validateTrackConfigBase(track, label);
  }
  return tracks;
}

export function formatZodError(error: z.ZodError) {
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
