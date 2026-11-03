import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextProxy } from "next/server";
import { requireClerkKeys } from "./features/account/server/identity";
import { signInPath } from "./features/account/signIn";

// With `CLERK_JWT_KEY`, Clerk verifies session tokens without fetching its signing keys.
const clerk = clerkMiddleware({ signInUrl: signInPath, jwtKey: process.env.CLERK_JWT_KEY });

/** Clerk authenticates each request for `auth()`. Missing keys fail every request. */
export const proxy: NextProxy = (request, event) => {
  requireClerkKeys(process.env);
  return clerk(request, event);
};

export const config = {
  // Clerk's recommended matcher: every route except Next internals and static files.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api(.*)",
  ],
};
