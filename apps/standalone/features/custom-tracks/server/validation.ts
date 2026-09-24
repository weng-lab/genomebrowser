import { z } from "zod";
import { getAssembly } from "@/features/assemblies/assemblies";
import { parseSerializedTrack } from "@/features/session-snapshot/parseSnapshot";
import { assertCatalogRules } from "../catalog";
import type { CustomTrack } from "../types";

const inputSchema = z.strictObject({ assemblyId: z.string(), track: z.unknown() });

export function parseCustomTrack(input: unknown): CustomTrack {
  const data = inputSchema.parse(input);
  const assembly = getAssembly(data.assemblyId);
  if (!assembly) throw new Error("Choose a supported assembly.");
  const track = parseSerializedTrack(data.track);
  z.uuid().parse(track.base.id);
  if (track.source !== "user") throw new Error("Custom tracks must be user-owned.");
  assertCatalogRules(track, assembly.definition.id);
  return { assemblyId: assembly.definition.id, track };
}
