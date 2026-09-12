import { z } from "zod";
import type { AnyTrackModule } from "@weng-lab/genomebrowser";
import { createTrackCollectionSchema } from "./collectionSchema";

export function generateTrackCollectionJsonSchema(modules: readonly AnyTrackModule[]) {
  return z.toJSONSchema(createTrackCollectionSchema(modules), { io: "input" });
}
