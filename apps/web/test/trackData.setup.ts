import { vi } from "vitest";

// App tests exercise real track stores and renderers without downloading genomic files.
// Keep these data requests separate from each test's command/session HTTP fixtures.
vi.mock("@weng-lab/genomebrowser-tracks/gene", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@weng-lab/genomebrowser-tracks/gene")>();
  return { ...actual, geneModule: { ...actual.geneModule, fetch: async () => [] } };
});

vi.mock("@weng-lab/genomebrowser-tracks/ccre", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@weng-lab/genomebrowser-tracks/ccre")>();
  return { ...actual, ccreBigBedModule: { ...actual.ccreBigBedModule, fetch: async () => [] } };
});

vi.mock("@weng-lab/genomebrowser-tracks/bigbed", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@weng-lab/genomebrowser-tracks/bigbed")>();
  return { ...actual, bigBedModule: { ...actual.bigBedModule, fetch: async () => [] } };
});

vi.mock("@weng-lab/genomebrowser-tracks/cave", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@weng-lab/genomebrowser-tracks/cave")>();
  return {
    ...actual,
    caveModule: { ...actual.caveModule, fetch: async () => ({ top: [], bottom: [] }) },
  };
});

vi.mock("@weng-lab/genomebrowser-tracks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@weng-lab/genomebrowser-tracks")>();
  return {
    ...actual,
    firstPartyTrackModules: actual.firstPartyTrackModules.map((module) => {
      if (module.type === "cave")
        return { ...module, fetch: async () => ({ top: [], bottom: [] }) };
      if (["gene", "ccre-bigbed", "bigbed", "bigwig"].includes(module.type))
        return { ...module, fetch: async () => [] };
      return module;
    }),
  };
});
