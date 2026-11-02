import { z } from "zod";
import { defineCommand } from "./define";

const imageFormatSchema = z.enum(["svg", "png"]);

export const exportImage = defineCommand({
  name: "export_image",
  description:
    "Export the genome browser's current view as one image and show it to the user in a preview with a Download button. The image is not returned to you; the user decides whether to download it. Fails while tracks are loading or when the browser page is not open. Returns the file name and size in pixels.",
  params: z.strictObject({
    format: imageFormatSchema
      .default("svg")
      .describe("svg for publications and editing, png for slides and documents."),
    scale: z
      .number()
      .min(1)
      .max(3)
      .default(2)
      .describe(
        "PNG pixels per screen pixel: 1 screen, 2 high resolution, 3 print. SVG ignores it.",
      ),
    includeTitles: z.boolean().default(true).describe("Show each track's name above it."),
    includeRuler: z.boolean().default(true).describe("Include coordinate ruler tracks."),
    filename: z
      .string()
      .max(180)
      .optional()
      .describe("File name without extension. Omit to name it after the region."),
  }),
  result: z.strictObject({
    filename: z.string(),
    format: imageFormatSchema,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  async run(app, { format, ...options }, signal) {
    if (app.stores.useBrowserStore.getState().isLoading) {
      const error = "Wait for the tracks to finish loading before exporting.";
      return { ok: false, code: "EXPORT_FAILED", error };
    }
    try {
      const image = await app.exportImage(format, options, signal);
      signal.throwIfAborted();
      app.showImage(image);
      const { width, height } = image;
      return { ok: true, value: { filename: image.filename, format, width, height } };
    } catch (cause) {
      if (signal.aborted)
        return { ok: false, code: "CANCELLED", error: "The export was cancelled" };
      const error = cause instanceof Error ? cause.message : "The image could not be exported";
      return { ok: false, code: "EXPORT_FAILED", error };
    }
  },
});
