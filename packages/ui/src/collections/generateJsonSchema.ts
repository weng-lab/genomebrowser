import { z } from "zod";
import type { ModuleRegistry } from "@weng-lab/genomebrowser";
import { createTrackCollectionSchema } from "./collectionSchema";

export function generateTrackCollectionJsonSchema(registry: ModuleRegistry) {
  return z.toJSONSchema(createTrackCollectionSchema(registry), { io: "input" });
}
