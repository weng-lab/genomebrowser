import { z } from "zod";

/** A named, colored group of saved regions, as sessions save it. Members are highlight IDs. */
export const regionGroupSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  // Six-digit hex, as track colors are, so the header can compute a contrasting text color.
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  collapsed: z.boolean(),
  regionIds: z.array(z.string().min(1)),
});

export type RegionGroup = z.infer<typeof regionGroupSchema>;
