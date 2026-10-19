import {
  createBrowserStore,
  createTrackStore,
  hg38,
  type GenomeBrowserStores,
} from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { ccreBigBedModule } from "@weng-lab/genomebrowser-tracks/ccre";
import { geneModule } from "@weng-lab/genomebrowser-tracks/gene";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

/** The app's starting view and tracks for each assembly it supports. */
const starters = {
  hg38: {
    assembly: hg38,
    label: "Human (GRCh38/hg38)",
    region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
    tracks: () => [
      rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} }),
      geneModule.create({
        base: { id: "genes", title: "GENCODE 50 basic", display: "merged" },
        config: {
          url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v50.basic.annotation.bb",
        },
      }),
      ccreBigBedModule.create({
        base: { id: "ccres", title: "Human cCREs" },
        config: { url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed" },
      }),
    ],
  },
};

/** Assemblies a new session can use, for choosing one. */
export const supportedAssemblies = Object.values(starters).map(({ assembly, label }) => ({
  id: assembly.id,
  label,
}));

/**
 * New browser and track stores for an assembly, starting at its default view and
 * tracks, or undefined for an unsupported assembly. Every first-party track module
 * is registered so a restored session can contain any of their tracks.
 */
export function createStores(assemblyId: string): GenomeBrowserStores | undefined {
  const starter = Object.values(starters).find(({ assembly }) => assembly.id === assemblyId);
  if (!starter) return undefined;
  return {
    useBrowserStore: createBrowserStore({ assembly: starter.assembly, region: starter.region }),
    useTrackStore: createTrackStore({ modules: firstPartyTrackModules, tracks: starter.tracks() }),
  };
}
