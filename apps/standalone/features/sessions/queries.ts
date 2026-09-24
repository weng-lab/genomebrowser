import "server-only";

import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { isAuthConfigured } from "@/features/auth/config";
import { sessionIdSchema } from "./server/schemas";
import { getSessionRepository } from "./server/repository";
import type { SessionListResult } from "./types";

// Pages redirect signed-out visitors to sign in, so they read Clerk directly instead of
// returning an error result through requireOwner.

export async function getCurrentUserSessions(): Promise<
  SessionListResult | { status: "auth-unavailable" }
> {
  if (!isAuthConfigured()) return { status: "auth-unavailable" };
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: "/dashboard" });
  try {
    const repository = await getSessionRepository();
    if (!repository) return { status: "storage-unavailable" };
    return { status: "ready", sessions: await repository.listByOwner(userId) };
  } catch {
    return { status: "error" };
  }
}

export async function getCurrentUserSession(id: string) {
  if (!isAuthConfigured()) return { status: "auth-unavailable" } as const;
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: `/browser/${encodeURIComponent(id)}` });
  if (!sessionIdSchema.safeParse(id).success) notFound();
  const repository = await getSessionRepository();
  if (!repository) return { status: "storage-unavailable" } as const;
  const session = await repository.getByOwner(userId, id);
  if (!session) redirect("/browser");
  return { status: "ready", session } as const;
}
