import "server-only";
import { auth } from "@clerk/nextjs/server";

/** The acting user of the current request, or null when signed out. Resolve it for every operation. */
export type Identity = { userId(): Promise<string | null> };

/** The signed-in Clerk user. `auth()` requires the request to pass through the proxy. */
export const clerkIdentity: Identity = {
  async userId() {
    return (await auth()).userId;
  },
};

/**
 * Fails unless both Clerk keys are configured. Without them, Clerk would start
 * keyless development mode with a temporary application instead of the
 * project's instance, so requests fail rather than sign users in elsewhere.
 * Builds read no keys.
 */
export function requireClerkKeys(env: NodeJS.ProcessEnv) {
  const missing = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"].filter(
    (name) => !env[name],
  );
  if (missing.length)
    throw new Error(`${missing.join(" and ")} must be set to the project's Clerk instance keys`);
}
