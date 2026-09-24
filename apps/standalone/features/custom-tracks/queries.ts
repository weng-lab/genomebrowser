import "server-only";
import { auth } from "@clerk/nextjs/server";
import { isAuthConfigured } from "@/features/auth/config";
import { getCustomTrackRepository } from "./server/repository";
import type { CustomTracksResult } from "./types";

export async function getCurrentUserCustomTracks(): Promise<CustomTracksResult> {
  if (!isAuthConfigured()) return { status: "signed-out" };
  const { userId } = await auth();
  if (!userId) return { status: "signed-out" };
  try {
    const repository = await getCustomTrackRepository();
    if (!repository) return { status: "storage-unavailable" };
    return { status: "ready", tracks: await repository.listByOwner(userId) };
  } catch {
    return { status: "error" };
  }
}
