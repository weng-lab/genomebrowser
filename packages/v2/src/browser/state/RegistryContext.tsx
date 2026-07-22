import { useMemo, type ReactNode } from "react";
import type { ModuleRegistry } from "../../modules/registry";
import { RegistryContext } from "./registryContextValue";

export function RegistryProvider({
  registry,
  children,
}: {
  registry: ModuleRegistry;
  children: ReactNode;
}) {
  const value = useMemo(() => registry, [registry]);
  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}
