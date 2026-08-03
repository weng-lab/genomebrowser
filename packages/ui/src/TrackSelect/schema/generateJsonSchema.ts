import { z } from "zod";
import type { ModuleRegistry } from "@weng-lab/genomebrowser";
import { createCollectionSchema } from "./collectionSchema";

export function generateTrackCollectionJsonSchema(registry: ModuleRegistry) {
  return z.toJSONSchema(createCollectionSchema(registry), { io: "input" });
}
