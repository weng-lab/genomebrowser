"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isAuthConfigured } from "../auth/config";
import { getCustomTrackRepository } from "./repository";
import { parseCustomTrack } from "./validation";
import type { SaveCustomTrackResult } from "./types";

export async function saveCustomTrack(input: unknown): Promise<SaveCustomTrackResult> {
  if (!isAuthConfigured()) return { ok: false, error: "Accounts are unavailable." };
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to save custom tracks." };
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
    const repository = getCustomTrackRepository();
    if (!repository) return { ok: false, error: "Custom track storage is unavailable." };
    const saved = await repository.save(userId, entry);
    revalidatePath("/dashboard");
    return { ok: true, entry: saved };
  } catch {
    return { ok: false, error: "Your track could not be saved. Please try again." };
  }
}
