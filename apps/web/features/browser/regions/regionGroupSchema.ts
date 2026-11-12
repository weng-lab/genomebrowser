import { z } from "zod";

/** A named, colored group of saved regions, as sessions save it. Members are highlight IDs. */
export const regionGroupSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string(),
  color: z.string().min(1),
  collapsed: z.boolean(),
  regionIds: z.array(z.string().min(1)),
});

export type RegionGroup = z.infer<typeof regionGroupSchema>;
