import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFetchSignature, fetchOnChange } from "../../src/modules/fetchOnChange";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { bulkBedModule } from "../../src/tracks/bulkbed/module";

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
      id: "signal",
      title: "Signal",
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
      id: "signal",
      title: "Signal",
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
      id: "signal",
      title: "Signal",
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
      id: "signal",
      title: "Signal",
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
      id: "bulk-signal",
      title: "Bulk signal",
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

  it("includes bulkbed dataset urls in fetch signatures", () => {
    const track = bulkBedModule.create({
      id: "bulk-peaks",
      title: "Bulk peaks",
      config: {
        datasets: [
          { name: "Dataset A", url: "URL_A" },
          { name: "Dataset B", url: "URL_B" },
        ],
      },
    });

    expect(createFetchSignature(bulkBedModule, track)).toBeTypeOf("string");
    expect(
      createFetchSignature(bulkBedModule, {
        ...track,
        config: {
          ...track.config,
          datasets: [{ name: "Dataset C", url: "URL_A" }, track.config.datasets[1]],
        },
      }),
    ).toBe(createFetchSignature(bulkBedModule, track));
    expect(
      createFetchSignature(bulkBedModule, {
        ...track,
        config: {
          ...track.config,
          datasets: [{ name: "Dataset A", url: "URL_C" }, track.config.datasets[1]],
        },
      }),
    ).not.toBe(createFetchSignature(bulkBedModule, track));
  });

  it("canonicalizes object keys and distinguishes special numbers", () => {
    expect(signatureFor({ second: 2, first: 1 })).toBe(signatureFor({ first: 1, second: 2 }));
    expect(signatureFor(-0)).not.toBe(signatureFor(0));
    expect(signatureFor(Number.NaN)).not.toBe(signatureFor(null));
    expect(signatureFor(Number.POSITIVE_INFINITY)).not.toBe(signatureFor(Number.NEGATIVE_INFINITY));
  });

  it("encodes Map, Set, and mixed Date and bigint values", () => {
    expect(signatureFor(new Map([["key", 1]]))).not.toBe(signatureFor(new Map([["key", 2]])));
    expect(signatureFor(new Set(["first"]))).not.toBe(signatureFor(new Set(["second"])));

    const first = { timestamp: new Date("2026-01-01T00:00:00Z"), revision: 1n };
    const second = { timestamp: new Date("2026-01-01T00:00:00Z"), revision: 2n };
    expect(() => signatureFor(first)).not.toThrow();
    expect(signatureFor(first)).not.toBe(signatureFor(second));
  });

  it("encodes cycles and repeated references without throwing", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const shared = { value: "shared" };
    const repeated = { first: shared, second: shared };

    expect(() => signatureFor(cyclic)).not.toThrow();
    expect(signatureFor(cyclic)).toBe(signatureFor(cyclic));
    expect(() => signatureFor(repeated)).not.toThrow();

    expect(signatureFor(Symbol("value"))).not.toBe(signatureFor(Symbol("value")));
    expect(signatureFor(() => 1)).not.toBe(signatureFor(() => 1));
  });

  it("distinguishes custom instances whose state is not visibly enumerable", () => {
    class PrivateValue {
      #value: string;

      constructor(value: string) {
        this.#value = value;
      }

      read() {
        return this.#value;
      }
    }

    const first = new PrivateValue("first");
    expect(first.read()).toBe("first");
    expect(signatureFor(first)).toBe(signatureFor(first));
    expect(signatureFor(first)).not.toBe(signatureFor(new PrivateValue("second")));
  });
});
