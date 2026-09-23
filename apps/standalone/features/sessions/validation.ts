import Ajv2020 from "ajv/dist/2020";
import { z } from "zod";
import collectionSchema from "../../schemas/trackCollection.schema.json";
import type { SaveSessionInput, SessionSnapshot } from "./types";
import { getAssembly } from "../browser/assembly";

const coordinate = z.number().int().nonnegative();
const region = z.strictObject({
  chromosome: z.string().min(1),
  start: coordinate,
  end: coordinate,
});
const highlightStyle = {
  color: z.string().min(1),
  opacity: z.number().min(0).max(1).optional(),
  type: z.enum(["filled", "outlined"]).optional(),
};
const snapshotSchema = z.strictObject({
  version: z.literal(1),
  browser: z.strictObject({
    assembly: z.strictObject({
      id: z.string().min(1),
      chromosomes: z.record(z.string().min(1), z.number().int().positive()),
    }),
    region,
    highlights: z.array(
      z.strictObject({
        id: z.string().min(1),
        region: z.strictObject({
          chromosome: z.string().min(1).optional(),
          start: z.number().int(),
          end: z.number().int(),
        }),
        ...highlightStyle,
      }),
    ),
    marginWidth: z.number().positive(),
    trackWidth: z.number().positive(),
    fontSize: z.number().positive(),
    titleSize: z.number().positive(),
    selectionHighlight: z.strictObject(highlightStyle),
  }),
  trackStore: z.strictObject({
    tracks: z.array(
      z.strictObject({
        type: z.string().min(1),
        source: z.enum(["host", "user"]),
        base: z.strictObject({
          id: z.string().min(1),
          title: z.string().min(1),
          display: z.string().min(1),
          height: z.number().positive(),
          color: z.string().regex(/^#[0-9a-f]{6}$/i),
        }),
        config: z.record(z.string(), z.json()),
      }),
    ),
    pinnedTrackIds: z.array(z.string().min(1)),
  }),
});

// Use the generated module schemas without importing React renderers on the server.
const validateTracks = new Ajv2020({
  strict: false,
  formats: {
    uri: (value: string) => URL.canParse(value) && /^https?:$/.test(new URL(value).protocol),
  },
}).compile(collectionSchema.properties.tracks);

export function parseSessionSnapshot(input: unknown): SessionSnapshot {
  const snapshot = snapshotSchema.parse(input);
  const { browser, trackStore } = snapshot;
  const assembly = getAssembly(browser.assembly.id);
  if (
    !assembly ||
    JSON.stringify(Object.entries(browser.assembly.chromosomes).sort()) !==
      JSON.stringify(Object.entries(assembly.definition.chromosomes).sort())
  ) {
    throw new Error("Choose an assembly from the application registry.");
  }
  const length = browser.assembly.chromosomes[browser.region.chromosome];
  if (!length || browser.region.start >= browser.region.end || browser.region.end > length) {
    throw new Error("The visible region must be within the session assembly.");
  }
  if (browser.highlights.some(({ region }) => region.start >= region.end)) {
    throw new Error("Highlight start must be less than its end.");
  }
  if (new Set(browser.highlights.map(({ id }) => id)).size !== browser.highlights.length) {
    throw new Error("Highlight IDs must be unique.");
  }
  const ids = trackStore.tracks.map(({ base }) => base.id);
  const trackIds = new Set(ids);
  if (
    trackIds.size !== ids.length ||
    new Set(trackStore.pinnedTrackIds).size !== trackStore.pinnedTrackIds.length
  ) {
    throw new Error("Track IDs and pinned track IDs must be unique.");
  }
  const pinned = trackStore.pinnedTrackIds.filter((id) => trackIds.has(id));
  if (pinned.some((id, index) => ids[index] !== id)) {
    throw new Error("Pinned tracks must appear first in their configured order.");
  }
  if (
    !validateTracks(trackStore.tracks.map(({ type, base, config }) => ({ type, base, config })))
  ) {
    throw new Error("A track has an unknown module or invalid configuration.");
  }
  return snapshot;
}

export const sessionIdSchema = z.uuid();
const saveFields = { name: z.string().trim().min(1).max(100), snapshot: z.unknown() };
const saveInputSchema = z.union([
  z.strictObject(saveFields),
  z.strictObject({ ...saveFields, id: sessionIdSchema, revision: z.number().int().positive() }),
]);

export function parseSaveSessionInput(input: unknown): SaveSessionInput {
  const parsed = saveInputSchema.parse(input);
  return { ...parsed, snapshot: parseSessionSnapshot(parsed.snapshot) };
}
