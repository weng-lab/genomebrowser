import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFetchSignature, fetchOnChange } from "../../src/modules/fetchOnChange";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

describe("fetchOnChange", () => {
  function Renderer() {
    return null;
  }

  const arbitraryValueModule = defineTrackModule({
    type: "arbitrary-signature-value",
    configSchema: z.object({ value: fetchOnChange(z.custom<unknown>(() => true)) }),
    fetch: async () => null,
    render: { full: Renderer },
  });

  function signatureFor(value: unknown) {
    return createFetchSignature(arbitraryValueModule, { config: { value } });
  }

  it("includes only marked config fields in fetch signatures", () => {
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({
        url: fetchOnChange(z.string().min(1)),
        colorBy: z.string().optional(),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({
      base: {
        id: "signal",
        title: "Signal",
      },
      config: {
        url: "YOUR_URL_HERE",
        colorBy: "score",
      },
    });

    expect(createFetchSignature(module, track)).toBeTypeOf("string");
    expect(
      createFetchSignature(module, {
        ...track,
        config: { ...track.config, colorBy: "name" },
      }),
    ).toBe(createFetchSignature(module, track));
    expect(
      createFetchSignature(module, {
        ...track,
        config: { ...track.config, url: "OTHER_URL" },
      }),
    ).not.toBe(createFetchSignature(module, track));
  });

  it("ignores base and interaction changes", () => {
    const module = defineTrackModule({
      type: "visual",
      configSchema: z.object({ url: fetchOnChange(z.string().min(1)) }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({
      base: {
        id: "signal",
        title: "Signal",
      },
      config: { url: "YOUR_URL_HERE" },
    });

    expect(
      createFetchSignature(module, {
        ...track,
        base: { ...track.base, color: "#000000", height: 100 },
        interaction: { onClick: () => undefined },
      }),
    ).toBe(createFetchSignature(module, track));
  });

  it("returns a stable empty signature when no fields are marked", () => {
    const module = defineTrackModule({
      type: "unmarked",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({
      base: {
        id: "signal",
        title: "Signal",
      },
      config: { url: "YOUR_URL_HERE" },
    });

    expect(createFetchSignature(module, track)).toBeTypeOf("string");
    expect(
      createFetchSignature(module, { ...track, config: { ...track.config, url: "OTHER_URL" } }),
    ).toBe(createFetchSignature(module, track));
  });

  it("preserves nested object shape for marked fields", () => {
    const module = defineTrackModule({
      type: "nested",
      configSchema: z.object({
        source: z.object({
          url: fetchOnChange(z.string().min(1)),
          label: z.string().min(1),
        }),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({
      base: {
        id: "signal",
        title: "Signal",
      },
      config: { source: { url: "YOUR_URL_HERE", label: "Signal A" } },
    });

    expect(createFetchSignature(module, track)).toBeTypeOf("string");
    expect(
      createFetchSignature(module, {
        ...track,
        config: { source: { ...track.config.source, label: "Signal B" } },
      }),
    ).toBe(createFetchSignature(module, track));
    expect(
      createFetchSignature(module, {
        ...track,
        config: { source: { ...track.config.source, url: "OTHER_URL" } },
      }),
    ).not.toBe(createFetchSignature(module, track));
  });

  it("preserves nested array shape for marked fields", () => {
    const module = defineTrackModule({
      type: "bulk-example",
      configSchema: z.object({
        datasets: z.array(
          z.object({
            name: z.string().min(1),
            url: fetchOnChange(z.string().min(1)),
          }),
        ),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({
      base: {
        id: "bulk-signal",
        title: "Bulk signal",
      },
      config: {
        datasets: [
          { name: "Dataset A", url: "URL_A" },
          { name: "Dataset B", url: "URL_B" },
        ],
      },
    });

    expect(createFetchSignature(module, track)).toBeTypeOf("string");
    expect(
      createFetchSignature(module, {
        ...track,
        config: {
          datasets: [{ name: "Dataset C", url: "URL_A" }, track.config.datasets[1]],
        },
      }),
    ).toBe(createFetchSignature(module, track));
    expect(
      createFetchSignature(module, {
        ...track,
        config: {
          datasets: [{ name: "Dataset A", url: "URL_C" }, track.config.datasets[1]],
        },
      }),
    ).not.toBe(createFetchSignature(module, track));
    expect(
      createFetchSignature(module, {
        ...track,
        config: { datasets: [track.config.datasets[1], track.config.datasets[0]] },
      }),
    ).not.toBe(createFetchSignature(module, track));
  });

  it("compares JSON values by content and other values by identity", () => {
    expect(signatureFor({ items: [1, "a", null] })).toBe(signatureFor({ items: [1, "a", null] }));
    expect(signatureFor(Number.NaN)).not.toBe(signatureFor(null));
    expect(signatureFor(Number.POSITIVE_INFINITY)).not.toBe(signatureFor(Number.NEGATIVE_INFINITY));

    const date = new Date("2026-01-01T00:00:00Z");
    expect(signatureFor(date)).toBe(signatureFor(date));
    expect(signatureFor(date)).not.toBe(signatureFor(new Date("2026-01-01T00:00:00Z")));
    expect(signatureFor(new Map([["key", 1]]))).not.toBe(signatureFor(new Map([["key", 1]])));
    expect(signatureFor(() => 1)).not.toBe(signatureFor(() => 1));
    expect(signatureFor(Symbol("value"))).not.toBe(signatureFor(Symbol("value")));
  });

  it("falls back to config identity for values that cannot be stringified", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const config = { value: cyclic };

    expect(() => createFetchSignature(arbitraryValueModule, { config })).not.toThrow();
    expect(createFetchSignature(arbitraryValueModule, { config })).toBe(
      createFetchSignature(arbitraryValueModule, { config }),
    );
    expect(createFetchSignature(arbitraryValueModule, { config })).not.toBe(
      createFetchSignature(arbitraryValueModule, { config: { value: cyclic } }),
    );
  });
});
