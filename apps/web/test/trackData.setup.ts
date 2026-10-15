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

// The collection picker registers all first-party modules so added tracks can restore.
// Replace only their data fetching; catalog validation and track creation stay real.
vi.mock("@weng-lab/genomebrowser-tracks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@weng-lab/genomebrowser-tracks")>();
  return {
    ...actual,
    firstPartyTrackModules: actual.firstPartyTrackModules.map((module) =>
      module.type === "ruler" ? module : { ...module, fetch: async () => [] },
    ),
  };
});
