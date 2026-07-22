import { z } from "zod";
import type { ModuleRegistry } from "@weng-lab/genomebrowser";
import { createCatalogSchema } from "./catalogSchema";

export function generateTrackCatalogJsonSchema(registry: ModuleRegistry) {
  return z.toJSONSchema(createCatalogSchema(registry), { io: "input" });
}
