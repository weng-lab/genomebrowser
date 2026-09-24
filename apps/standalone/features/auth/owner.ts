import "server-only";
import { auth } from "@clerk/nextjs/server";
import { isAuthConfigured } from "./config";

export type OwnerResult = { ok: true; ownerId: string } | { ok: false; error: string };

/**
 * Resolve the owner of private data from the Clerk session.
 * Never accept an owner ID from a URL or request body.
 */
export async function requireOwner(signedOutError: string): Promise<OwnerResult> {
  if (!isAuthConfigured()) return { ok: false, error: "Accounts are unavailable." };
  const { userId } = await auth();
  return userId ? { ok: true, ownerId: userId } : { ok: false, error: signedOutError };
}
