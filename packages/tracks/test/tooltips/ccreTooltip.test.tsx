import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CcreBigBedTooltip } from "../../src/ccre/tooltip";

describe("cCRE BigBed tooltip", () => {
  it("shows the classification and a title swatch using the row color", () => {
    const markup = renderToStaticMarkup(
      <CcreBigBedTooltip
        item={{
          chromosome: "chr12",
          start: 53_322_309,
          end: 53_322_659,
          fields: [],
          name: "EH38E4064164",
          score: 0,
          strand: ".",
          thickStart: 53_322_309,
          thickEnd: 53_322_659,
          color: "rgb(255,167,0)",
          ccreClass: "pELS",
        }}
        context={{
          type: "ccre-bigbed",
          base: {
            id: "ccres",
            title: "cCREs",
            display: "dense",
            height: 12,
            color: "#4b9560",
          },
          config: { url: "YOUR_URL_HERE", rowHeight: 12 },
        }}
      />,
    );

    expect(markup).toContain('fill="rgb(255,167,0)"');
    expect(markup).toContain("EH38E4064164");
    expect(markup).toContain("Classification");
    expect(markup).toContain("pELS");
    expect(markup).toContain("chr12:53,322,309–53,322,659");
  });
});
