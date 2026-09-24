"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/features/auth/owner";
import { getCustomTrackRepository } from "./server/repository";
import { parseCustomTrack } from "./server/validation";
import type { SaveCustomTrackResult } from "./types";

export async function saveCustomTrack(input: unknown): Promise<SaveCustomTrackResult> {
  const owner = await requireOwner("Sign in to save custom tracks.");
  if (!owner.ok) return owner;
  let entry;
  try {
    entry = parseCustomTrack(input);
  } catch {
    return {
      ok: false,
      error: "Check the track settings and source URLs before adding the track.",
    };
  }
  try {
    const repository = await getCustomTrackRepository();
    if (!repository) return { ok: false, error: "Custom track storage is unavailable." };
    const saved = await repository.save(owner.ownerId, entry);
    revalidatePath("/dashboard");
    return { ok: true, entry: saved };
  } catch {
    return { ok: false, error: "Your track could not be saved. Please try again." };
  }
}
