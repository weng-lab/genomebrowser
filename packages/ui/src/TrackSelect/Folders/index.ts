import { Assembly, FolderDefinition } from "./types";
import { humanBiosamplesFolder } from "./biosamples/human";
import { mouseBiosamplesFolder } from "./biosamples/mouse";
import { humanGenesFolder } from "./genes/human";
import { mouseGenesFolder } from "./genes/mouse";

export {
  type Assembly,
  type FolderDefinition,
  type FolderRuntimeConfig,
} from "./types";

export type { BiosampleRowInfo } from "./biosamples/shared/types";
export type { GeneRowInfo } from "./genes/shared/types";

/**
 * Registry of folders available for each assembly.
 *
 * Each assembly can have multiple folders (e.g., biosamples, genes, etc.).
 * TrackSelect receives the folders for the current assembly and renders
 * them as tabs or a folder selector.
 *
 * To add a new folder:
 * 1. Create a folder config file (e.g., folders/genes/human.ts)
 * 2. Import and add it to the appropriate assembly array below
 */
export const foldersByAssembly: Record<Assembly, FolderDefinition[]> = {
  GRCh38: [humanGenesFolder, humanBiosamplesFolder],
  mm10: [mouseGenesFolder, mouseBiosamplesFolder],
};
