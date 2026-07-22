import type { ReactNode } from "react";
import {
  BrowserContext,
  InteractionGateContext,
  type BrowserContextValue,
  type InteractionGateContextValue,
} from "./browserContextState";

export function BrowserProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BrowserContextValue;
}) {
  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>;
}

export function InteractionGateProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: InteractionGateContextValue;
}) {
  return (
    <InteractionGateContext.Provider value={value}>{children}</InteractionGateContext.Provider>
  );
}
