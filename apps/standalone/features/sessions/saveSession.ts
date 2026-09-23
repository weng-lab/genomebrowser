import "server-only";
import { auth } from "@clerk/nextjs/server";
import { isAuthConfigured } from "../auth/config";
import { getSessionRepository, SessionWriteError } from "./repository";
import { parseSaveSessionInput } from "./validation";
import type { SaveSessionResult } from "./types";

export async function saveSession(input: unknown): Promise<SaveSessionResult> {
  if (!isAuthConfigured()) return { ok: false, error: "Accounts are unavailable." };
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to save your session." };
  let parsed;
  try {
    parsed = parseSaveSessionInput(input);
    if (!parsed.id) return { ok: false, error: "Create a session from the dashboard first." };
  } catch {
    return {
      ok: false,
      error:
        "The session is invalid. Use a name of 1–100 characters and valid browser and track settings.",
    };
  }
  try {
    const repository = await getSessionRepository();
    if (!repository) return { ok: false, error: "Session storage is not configured." };
    const result = await repository.save(userId, parsed);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      retryable: !(error instanceof SessionWriteError),
      error:
        error instanceof SessionWriteError
          ? error.message
          : "Your session could not be saved. Please try again.",
    };
  }
}
