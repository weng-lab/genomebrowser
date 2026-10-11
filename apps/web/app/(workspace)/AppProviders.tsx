"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { BrowserCommands } from "../../commands/BrowserCommands";

// Browser stores initialize browser-only rendering resources. The provider stays mounted
// in the shared layout while Next swaps the page supplied as children.
const BrowserSessionProvider = dynamic(
  () => import("../../session/BrowserSession").then((module) => module.BrowserSessionProvider),
  { ssr: false, loading: () => <output>Loading workspace…</output> },
);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserSessionProvider>
      <BrowserCommands endpoint="/api/browser">{children}</BrowserCommands>
    </BrowserSessionProvider>
  );
}
