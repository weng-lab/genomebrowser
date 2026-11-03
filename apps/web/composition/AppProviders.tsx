"use client";

import { useAuth } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { RemoteControlProvider } from "../features/agent/RemoteControlProvider";
import { BrowserSvgProvider } from "../features/browser/BrowserSvg";
import { WorkspaceSkeleton } from "../shared/workspace/WorkspaceSkeleton";
import { SessionProvider } from "../features/sessions/SessionProvider";

/**
 * Workspace state for the signed-in Clerk account. The account controls save or
 * discard edits before changing accounts. An account change made elsewhere, such
 * as signing out in another tab, discards unsaved edits: they cannot be saved
 * without the old account's credentials, and must not reach the new account.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  if (!isLoaded) return <WorkspaceSkeleton />;
  // Never let one account's open session, list, or pending saves reach another account.
  return (
    <SessionProvider key={userId ?? "signed-out"}>
      <BrowserSvgProvider>
        <RemoteControlProvider>{children}</RemoteControlProvider>
      </BrowserSvgProvider>
    </SessionProvider>
  );
}
