import type { ReactNode } from "react";
import { BrowserPage } from "../../../composition/pages/BrowserPage";

/** Shared by the empty browser and every session's browser, so the frame persists between them. */
export default function BrowserLayout({ children }: { children: ReactNode }) {
  return <BrowserPage>{children}</BrowserPage>;
}
