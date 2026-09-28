import { z } from "zod";
import { parsePublicInput, trackBaseSchema } from "./schemas";
import type {
  AnyTrackInstance,
  TrackBaseInput,
  TrackSource,
  TrackSettingsComponent,
} from "./types";
import type { ModuleRegistry } from "./registry";

const configSchema = z.strictObject({
  gap: z.number().nonnegative().default(4),
  opacity: z.number().min(0).max(1).default(1),
});
const childSchema = z.strictObject({
  type: z.string().min(1),
  base: trackBaseSchema,
  source: z.enum(["host", "user"]),
  config: z.record(z.string(), z.unknown()),
  interaction: z
    .record(
      z.string(),
      z.custom<(...args: never[]) => void>((v) => typeof v === "function"),
    )
    .optional(),
});
const baseSchema = trackBaseSchema.extend({ display: z.enum(["stack", "overlay"]) });
const tracksSchema = z
  .array(childSchema)
  .min(1)
  .superRefine((tracks, ctx) => {
    const ids = new Set<string>();
    tracks.forEach((track, index) => {
      if (ids.has(track.base.id))
        ctx.addIssue({
          code: "custom",
          path: [index, "base", "id"],
          message: "Duplicate child ID",
        });
      ids.add(track.base.id);
    });
  });
const createInputSchema = z.strictObject({
  base: baseSchema.extend({
    display: z.enum(["stack", "overlay"]).default("stack"),
    height: z.number().positive().default(150),
    color: trackBaseSchema.shape.color.default("#000000"),
  }),
  source: z.enum(["host", "user"]).default("user"),
  config: configSchema.default({ gap: 4, opacity: 1 }),
  tracks: tracksSchema,
});
const instanceSchema = z
  .strictObject({
    type: z.literal("composite"),
    base: baseSchema,
    source: z.enum(["host", "user"]),
    config: configSchema,
    tracks: tracksSchema,
  })
  .superRefine((track, ctx) => {
    if (track.tracks.some((child) => child.base.id === track.base.id))
      ctx.addIssue({
        code: "custom",
        path: ["base", "id"],
        message: "Composite and child IDs must differ",
      });
  });

export type CompositeInput = {
  base: TrackBaseInput<"stack" | "overlay">;
  source?: TrackSource;
  config?: Partial<z.output<typeof configSchema>>;
  tracks: AnyTrackInstance[];
};
export type CompositeTrack = z.output<typeof instanceSchema>;
export type CompositeTrackModule = ReturnType<typeof createCompositeModule>;

export function createCompositeModule(
  options: {
    settingsComponent?: TrackSettingsComponent<CompositeTrack["config"]>;
  } = {},
) {
  return {
    kind: "composite" as const,
    type: "composite" as const,
    displays: ["stack", "overlay"],
    configSchema,
    createInputSchema,
    create(input: CompositeInput): CompositeTrack {
      const parsed = parsePublicInput(createInputSchema, input, "composite input");
      return parsePublicInput(
        instanceSchema,
        { type: "composite", ...parsed },
        "composite instance",
      );
    },
    validate(input: unknown): CompositeTrack {
      return parsePublicInput(instanceSchema, input, "composite instance");
    },
    settingsComponent: options.settingsComponent,
  };
}

export function isCompositeTrack(
  track: AnyTrackInstance,
  registry: ModuleRegistry,
): track is CompositeTrack {
  return registry.get(track.type).kind === "composite";
}

export function getDataTracks(
  tracks: AnyTrackInstance[],
  registry: ModuleRegistry,
): AnyTrackInstance[] {
  return tracks.flatMap((track) => (isCompositeTrack(track, registry) ? track.tracks : [track]));
}
