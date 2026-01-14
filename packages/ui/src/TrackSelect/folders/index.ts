import { Assembly } from "../consts";
import { FolderDefinition } from "./types";

export { type FolderDefinition, type FolderRuntimeConfig } from "./types";

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
 *
 * Example:
 * ```typescript
 * import { humanGenesFolder } from "./genes/human";
 *
 * export const foldersByAssembly: Record<Assembly, FolderDefinition[]> = {
 *   GRCh38: [humanBiosamplesFolder, humanGenesFolder],
 *   mm10: [mouseBiosamplesFolder],
 * };
 * ```
 */
export const foldersByAssembly: Record<Assembly, FolderDefinition[]> = {
  GRCh38: [
    // TODO: Add humanBiosamplesFolder in task 1.3
  ],
  mm10: [
    // TODO: Add mouseBiosamplesFolder in task 1.3
  ],
};
