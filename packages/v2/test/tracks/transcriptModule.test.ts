import { describe, expect, it } from "vitest";
import { transcriptModule } from "../../src/tracks/transcript/module";

describe("Transcript module", () => {
  it("creates configs with a default tooltip", () => {
    const config = transcriptModule.create({
      id: "genes",
      title: "Genes",
      assembly: "GRCh38",
      version: 40,
    });

    expect(config.tooltip).toBeTypeOf("function");
  });
});
