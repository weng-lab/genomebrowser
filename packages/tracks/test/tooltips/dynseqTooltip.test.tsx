import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { configSchema } from "../../src/dynseq/schema";
import { DynseqTooltip } from "../../src/dynseq/tooltip";

describe("dynseq tooltip", () => {
  it("shows a nucleotide's one-based position", () => {
    const markup = renderToStaticMarkup(
      <DynseqTooltip
        item={{ position: 1_233, score: 0.5, base: "A" }}
        context={{
          type: "dynseq",
          base: { id: "dynseq", title: "Dynseq", display: "full", height: 50, color: "#000000" },
          config: configSchema.parse({ url: "YOUR_URL_HERE", twoBitUrl: "YOUR_URL_HERE" }),
        }}
      />,
    );

    expect(markup).toContain("1,234");
    expect(markup).toContain("0.5000");
  });
});
