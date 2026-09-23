import "server-only";

import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { isAuthConfigured } from "../auth/config";
import { getSessionRepository } from "./repository";
import type { SessionListResult } from "./types";
import { sessionIdSchema } from "./validation";

export async function getCurrentUserSessions(): Promise<
  SessionListResult | { status: "auth-unavailable" }
> {
  if (!isAuthConfigured()) return { status: "auth-unavailable" };

  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: "/dashboard" });

  // Resolve the owner here, never from a URL or client-supplied user ID.
  try {
    const repository = getSessionRepository();
    if (!repository) return { status: "storage-unavailable" };
    const sessions = await repository.listByOwner(userId);
    return { status: "ready", sessions };
  } catch {
    return { status: "error" };
  }
}

export async function getCurrentUserSession(id: string) {
  if (!isAuthConfigured()) return { status: "auth-unavailable" } as const;
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: `/browser/${encodeURIComponent(id)}` });
  if (!sessionIdSchema.safeParse(id).success) notFound();
  const repository = getSessionRepository();
  if (!repository) return { status: "storage-unavailable" } as const;
  const session = await repository.getByOwner(userId, id);
  if (!session) notFound();
  return { status: "ready", session } as const;
}
