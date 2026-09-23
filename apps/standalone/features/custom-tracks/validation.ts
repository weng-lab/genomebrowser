import { validateSourceUrls } from "./sourceUrls";
import { z } from "zod";
import { getAssembly } from "../browser/assembly";
import { createInitialSnapshot } from "../sessions/initialSnapshot";
import { parseSessionSnapshot } from "../sessions/validation";
import type { CustomTrack } from "./types";

export function parseCustomTrack(input: unknown): CustomTrack {
  const data = z.strictObject({ assemblyId: z.string(), track: z.unknown() }).parse(input);
  const assembly = getAssembly(data.assemblyId);
  if (!assembly) throw new Error("Choose a supported assembly.");
  const snapshot = createInitialSnapshot(assembly);
  const parsed = parseSessionSnapshot({
    ...snapshot,
    trackStore: { tracks: [data.track], pinnedTrackIds: [] },
  });
  const track = parsed.trackStore.tracks[0];
  z.uuid().parse(track.base.id);
  if (track.source !== "user") throw new Error("Custom tracks must be user-owned.");
  if (track.type === "cave" && data.assemblyId !== "hg38") throw new Error("CAVE requires hg38.");
  const urls = validateSourceUrls(track.config);
  if (track.type === "methylc" && urls.length === 0) {
    throw new Error("Enter at least one methylation source URL.");
  }
  return { assemblyId: assembly.definition.id, track };
}
