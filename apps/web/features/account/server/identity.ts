import "server-only";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

/** The acting user of the current request, or null when signed out. Resolve it for every operation. */
export type Identity = { userId(): Promise<string | null> };

export type IdentityMode = "clerk" | "mock";

/** Stable local users. The prefix keeps them distinct from Clerk user IDs. */
export const mockUserIds = ["mock_user_1", "mock_user_2"] as const;

/** Selects a mock user. Without it, requests act as the first mock user; any other value is signed out. */
export const mockUserCookie = "gb_mock_user";

/** Clerk's sign-in page. It does not exist with mock identity. */
export const signInPath = "/sign-in";

/**
 * Clerk unless `GB_IDENTITY=mock` explicitly enables local mock users. Mock
 * identity is refused in production. The proxy, root layout, and session
 * composition read it from the runtime environment, so they always agree.
 */
export function identityMode(env: NodeJS.ProcessEnv): IdentityMode {
  const mode = env.GB_IDENTITY ?? "clerk";
  if (mode !== "clerk" && mode !== "mock")
    throw new Error(`GB_IDENTITY must be "clerk" or "mock", not "${mode}"`);
  if (mode === "mock" && env.NODE_ENV === "production")
    throw new Error("Mock identity is unavailable in production");
  return mode;
}

export function createIdentity(mode: IdentityMode): Identity {
  return mode === "mock" ? mockIdentity : clerkIdentity;
}

const clerkIdentity: Identity = {
  async userId() {
    return (await auth()).userId;
  },
};

const mockIdentity: Identity = {
  async userId() {
    const requested = (await cookies()).get(mockUserCookie)?.value ?? mockUserIds[0];
    return mockUserIds.find((id) => id === requested) ?? null;
  },
};
