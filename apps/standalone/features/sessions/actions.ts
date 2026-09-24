"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAssembly } from "@/features/assemblies/assemblies";
import { requireOwner } from "@/features/auth/owner";
import { createInitialSnapshot } from "@/features/session-snapshot/initialSnapshot";
import type { ActionResult } from "@/lib/actionResult";
import { SESSION_NAME_MAX_LENGTH } from "./rules";
import { sessionIdSchema, sessionNameSchema } from "./server/schemas";
import { getSessionRepository, SessionWriteError } from "./server/repository";
import type { SaveSessionResult } from "./types";

const createInputSchema = z.strictObject({ name: sessionNameSchema, assemblyId: z.string() });

export async function createSession(input: unknown): Promise<SaveSessionResult> {
  const owner = await requireOwner("Sign in to create a session.");
  if (!owner.ok) return owner;
  const parsed = createInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Enter a name of 1–${SESSION_NAME_MAX_LENGTH} characters and choose an assembly.`,
    };
  }
  const assembly = getAssembly(parsed.data.assemblyId);
  if (!assembly) return { ok: false, error: "Choose an assembly from the list." };
  try {
    const repository = await getSessionRepository();
    if (!repository) return { ok: false, error: "Session storage is not configured." };
    const result = await repository.create(owner.ownerId, {
      name: parsed.data.name,
      snapshot: createInitialSnapshot(assembly),
    });
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

export async function deleteSession(id: string): Promise<ActionResult> {
  const owner = await requireOwner("Sign in to manage your sessions.");
  if (!owner.ok) return owner;
  if (!sessionIdSchema.safeParse(id).success) return { ok: false, error: "Invalid session ID." };
  try {
    const repository = await getSessionRepository();
    if (!repository) return { ok: false, error: "Session storage is not configured." };
    if (!(await repository.deleteByOwner(owner.ownerId, id))) {
      return { ok: false, error: "This session is no longer available." };
    }
    revalidatePath("/dashboard");
    revalidatePath(`/browser/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Your session could not be deleted. Please try again." };
  }
}
