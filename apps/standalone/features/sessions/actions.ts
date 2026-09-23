"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { isAuthConfigured } from "../auth/config";
import { getSessionRepository, SessionWriteError } from "./repository";
import { parseSaveSessionInput, sessionIdSchema } from "./validation";
import type { SaveSessionResult } from "./types";
import { getAssembly } from "../browser/assembly";
import { createInitialSnapshot } from "./initialSnapshot";

export async function createSession(input: unknown): Promise<SaveSessionResult> {
  if (!isAuthConfigured()) return { ok: false, error: "Accounts are unavailable." };
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to create a session." };
  const parsed = z
    .strictObject({ name: z.string().trim().min(1).max(100), assemblyId: z.string() })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Enter a name of 1–100 characters and choose an assembly." };
  const assembly = getAssembly(parsed.data.assemblyId);
  if (!assembly) return { ok: false, error: "Choose an assembly from the list." };
  try {
    const repository = await getSessionRepository();
    if (!repository) return { ok: false, error: "Session storage is not configured." };
    const result = await repository.save(
      userId,
      parseSaveSessionInput({ name: parsed.data.name, snapshot: createInitialSnapshot(assembly) }),
    );
    revalidatePath("/dashboard");
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof SessionWriteError
          ? error.message
          : "Your session could not be created. Please try again.",
    };
  }
}

export async function deleteSession(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAuthConfigured()) return { ok: false, error: "Accounts are unavailable." };
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to manage your sessions." };
  if (!sessionIdSchema.safeParse(id).success) return { ok: false, error: "Invalid session ID." };
  try {
    const repository = await getSessionRepository();
    if (!repository) return { ok: false, error: "Session storage is not configured." };
    if (!(await repository.deleteByOwner(userId, id)))
      return { ok: false, error: "This session is no longer available." };
    revalidatePath("/dashboard");
    revalidatePath(`/browser/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Your session could not be deleted. Please try again." };
  }
}
