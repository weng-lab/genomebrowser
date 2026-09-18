import { describe, expect, it } from "vitest";
import { ccreBigBedModule } from "../../src/ccre";
import { bedSchemas } from "@weng-lab/genomebrowser-tracks/shared";

describe("cCRE BigBed track", () => {
  it("defines a distinct module type", () => {
    const track = ccreBigBedModule.create({
      base: {
        id: "ccres",
        title: "cCREs",
      },
      config: { url: "YOUR_URL_HERE" },
    });

    expect(track.type).toBe("ccre-bigbed");
    expect(track.config.rowHeight).toBe(12);
  });

  it("parses the aggregate cCRE columns", () => {
    expect(Object.keys(bedSchemas.ccre.shape)).toEqual([
      "name",
      "score",
      "strand",
      "thickStart",
      "thickEnd",
      "color",
      "ccreClass",
    ]);

    expect(
      bedSchemas.ccre.parse({
        name: "EH38E4064188",
        score: "0",
        strand: ".",
        thickStart: "10",
        thickEnd: "20",
        color: "255,205,0",
        ccreClass: "dELS",
      }),
    ).toEqual({
      name: "EH38E4064188",
      score: 0,
      strand: ".",
      thickStart: 10,
      thickEnd: 20,
      color: "rgb(255,205,0)",
      ccreClass: "dELS",
    });
  });
});
