import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { createModuleRegistry, createTrackFromEntry } from "../../src/modules/registry";
import type { ModuleCreateInput, ModuleInstance } from "../../src/modules/types";

describe("track module type contracts", () => {
  function Renderer() {
    return null;
  }

  const moduleA = defineTrackModule({
    type: "a",
    configSchema: z.object({
      url: z.string().min(1),
      scale: z.enum(["auto", "fixed"]).default("auto"),
    }),
    fetch: async () => null,
    render: { full: Renderer },
  });

  const moduleB = defineTrackModule({
    type: "b",
    configSchema: z.object({
      endpoint: z.string().min(1),
      enabled: z.boolean().optional(),
    }),
    fetch: async () => null,
    render: { dense: Renderer },
  });

  const registry = createModuleRegistry([moduleA, moduleB]);

  it("derives create input from each module config schema", () => {
    expectTypeOf<ModuleCreateInput<typeof moduleA>>().toEqualTypeOf<{
      id: string;
      title: string;
      display?: string | undefined;
      height?: number | undefined;
      color?: string | undefined;
      config: {
        url: string;
        scale?: "auto" | "fixed" | undefined;
      };
    }>();

    expectTypeOf<ModuleCreateInput<typeof moduleB>>().toEqualTypeOf<{
      id: string;
      title: string;
      display?: string | undefined;
      height?: number | undefined;
      color?: string | undefined;
      config: {
        endpoint: string;
        enabled?: boolean | undefined;
      };
    }>();
  });

  it("narrows registry lookups by literal module type", () => {
    const module = registry.get("a");

    expectTypeOf(module.type).toEqualTypeOf<"a">();
    expectTypeOf<ModuleCreateInput<typeof module>>().toEqualTypeOf<
      ModuleCreateInput<typeof moduleA>
    >();
  });

  it("keeps erased registry lookups as module values", () => {
    const erasedRegistry = registry as ReturnType<typeof createModuleRegistry>;
    const module = erasedRegistry.get("a");

    expectTypeOf(module).not.toBeNever();
  });

  it("snapshots module lists before building the registry", () => {
    const modules = [moduleA];
    const snapshotRegistry = createModuleRegistry(modules);

    modules.push(moduleB as never);

    expect(snapshotRegistry.modules).toHaveLength(1);
    expect(() => snapshotRegistry.get("b")).toThrow(
      /No track module registered for type: b/,
    );
  });

  it("creates entries as the precise registry instance union", () => {
    const track = createTrackFromEntry(registry, {
      type: "a",
      id: "track-a",
      title: "Track A",
      config: { url: "YOUR_URL_HERE" },
    });

    expectTypeOf(track).toEqualTypeOf<
      ModuleInstance<typeof moduleA> | ModuleInstance<typeof moduleB>
    >();
    expectTypeOf(track.type).toEqualTypeOf<"a" | "b">();

    expectTypeOf<Extract<typeof track, { type: "a" }>["config"]>().toEqualTypeOf<{
      url: string;
      scale: "auto" | "fixed";
    }>();
    expectTypeOf<Extract<typeof track, { type: "b" }>["config"]>().toEqualTypeOf<{
      endpoint: string;
      enabled?: boolean | undefined;
    }>();
  });

  it("creates catalog entries through the runtime validation boundary", () => {
    expect(
      createTrackFromEntry(registry, {
        type: "a",
        id: "track-a",
        title: "Track A",
        metadata: { assay: "signal" },
        config: { url: "YOUR_URL_HERE" },
      }),
    ).toMatchObject({
      type: "a",
      base: {
        id: "track-a",
        title: "Track A",
      },
      config: {
        url: "YOUR_URL_HERE",
        scale: "auto",
      },
    });

    expect(() =>
      createTrackFromEntry(registry, {
        type: "missing",
        id: "track-missing",
        title: "Track Missing",
        config: {},
      }),
    ).toThrow(/No track module registered for type: missing/);

    expect(() =>
      createTrackFromEntry(registry, {
        type: "a",
        id: "track-a",
        title: "Track A",
        config: {},
      }),
    ).toThrow(/a input is invalid/);
  });
});
