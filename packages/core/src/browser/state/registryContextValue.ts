import { createContext } from "react";
import type { ModuleRegistry } from "../../modules/registry";

export const RegistryContext = createContext<ModuleRegistry | null>(null);
