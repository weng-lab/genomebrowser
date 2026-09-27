import type { ReactNode } from "react";
import { BrowserContext, type BrowserContextValue } from "./browserContextState";

export function BrowserProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BrowserContextValue;
}) {
  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>;
}
