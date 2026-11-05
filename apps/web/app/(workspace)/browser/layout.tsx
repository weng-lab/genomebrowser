import type { ReactNode } from "react";
import { BrowserPage } from "../../../features/browser/components/BrowserPage";

/** Shared by the empty browser and every session's browser, so the frame persists between them. */
export default function BrowserLayout({ children }: { children: ReactNode }) {
  return <BrowserPage>{children}</BrowserPage>;
}
