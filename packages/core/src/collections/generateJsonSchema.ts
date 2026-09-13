import { z } from "zod";
import type { AnyTrackModule } from "../modules/types";
import { createTrackCollectionSchema } from "./collectionSchema";

export function generateTrackCollectionJsonSchema(modules: readonly AnyTrackModule[]) {
  return z.toJSONSchema(createTrackCollectionSchema(modules), { io: "input" });
}
