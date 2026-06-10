import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFetchSignature, fetchOnChange } from "../../src/data/fetchOnChange";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

describe("fetchOnChange", () => {
  function Renderer() {
    return null;
  }

  it("includes only marked fields in fetch signatures", () => {
    const module = defineTrackModule({
      type: "example",
      schema: z.object({
        url: fetchOnChange(z.string().min(1)),
        colorBy: z.string().optional(),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const config = module.create({
      id: "signal",
      title: "Signal",
      url: "YOUR_URL_HERE",
      colorBy: "score",
    });

    expect(createFetchSignature(module, config)).toBe(JSON.stringify({ url: "YOUR_URL_HERE" }));
    expect(createFetchSignature(module, { ...config, colorBy: "name" })).toBe(
      createFetchSignature(module, config),
    );
    expect(createFetchSignature(module, { ...config, url: "OTHER_URL" })).not.toBe(
      createFetchSignature(module, config),
    );
  });

  it("returns a stable empty signature when no fields are marked", () => {
    const module = defineTrackModule({
      type: "unmarked",
      schema: z.object({ url: z.string().min(1) }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const config = module.create({ id: "signal", title: "Signal", url: "YOUR_URL_HERE" });

    expect(createFetchSignature(module, config)).toBe("{}");
    expect(createFetchSignature(module, { ...config, url: "OTHER_URL" })).toBe("{}");
  });
});
