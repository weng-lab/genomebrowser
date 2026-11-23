import { builtInTrackFields } from "@weng-lab/genomebrowser";
import { expect, it } from "vitest";
import { metadataSetInputSchema } from "../features/agent/commands/trackMetadataSchema";

// The agent's schema keeps its own copy of the names core reserves, because command files
// can't load core on the server. This keeps the copy from falling behind core's list.
it("refuses every field name core reserves for a track's own values", () => {
  for (const name of builtInTrackFields) {
    expect(metadataSetInputSchema.safeParse({ [name]: "x" }).success).toBe(false);
  }
  expect(metadataSetInputSchema.safeParse({ Assay: "x" }).success).toBe(true);
});
