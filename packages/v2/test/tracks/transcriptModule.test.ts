import { describe, expect, it } from "vitest";
import { transcriptModule } from "../../src/tracks/transcript/module";

describe("Transcript module", () => {
  it("defines tooltip UI on the module", () => {
    const config = transcriptModule.create({
      id: "genes",
      title: "Genes",
      assembly: "GRCh38",
      version: 40,
    });

    expect(transcriptModule.tooltipComponent).toBeTypeOf("function");
    expect(config).not.toHaveProperty("tooltip");
  });
});
