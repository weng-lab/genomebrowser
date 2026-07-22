import { use } from "react";
import { RegistryContext } from "./registryContextValue";

export function useRegistry() {
  const registry = use(RegistryContext);
  if (!registry) {
    throw new Error("useRegistry must be used within a RegistryProvider");
  }
  return registry;
}
