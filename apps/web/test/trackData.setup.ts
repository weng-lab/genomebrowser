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
